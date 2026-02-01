import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Object3D } from 'three';
import type { Matrix4 } from 'three';
import { Box3, Vector3 } from 'three';
import { useSimStore } from '@/store/useSimStore';
import type { SelfCollisionPair } from '@/store/useSimStore';

const _p0 = new Vector3();
const _p1 = new Vector3();
const _p2 = new Vector3();
const _p3 = new Vector3();
const _u = new Vector3();
const _v = new Vector3();
const _w0 = new Vector3();
const _dP = new Vector3();
const _baseBox = new Box3();
const _baseSize = new Vector3();
const _baseCenter = new Vector3();
const _segTmp = new Vector3();
const _tmpBox = new Box3();
const _tmpMin = new Vector3();
const _tmpMax = new Vector3();

function linkLabel(i: number) {
  return `Link${i + 1}`;
}

function pointSegmentDistSq(p: Vector3, a: Vector3, b: Vector3) {
  _segTmp.copy(b).sub(a);
  const lenSq = _segTmp.dot(_segTmp);
  if (lenSq < 1e-9) return p.distanceToSquared(a);
  const t = Math.max(0, Math.min(1, _w0.copy(p).sub(a).dot(_segTmp) / lenSq));
  _dP.copy(a).addScaledVector(_segTmp, t);
  return p.distanceToSquared(_dP);
}

// Closest distance^2 between segments P0-P1 and P2-P3.
// Standard algorithm (robust enough for our use).
function segmentSegmentDistSq(p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3) {
  // IMPORTANT: do NOT mutate the input vectors (they are also reused as scratch outside).
  const u = _u.copy(p1).sub(p0);
  const v = _v.copy(p3).sub(p2);
  const w0 = _w0.copy(p0).sub(p2);

  const a = u.dot(u);
  const b = u.dot(v);
  const c = v.dot(v);
  const d = u.dot(w0);
  const e = v.dot(w0);

  const denom = a * c - b * b;
  let sN = 0;
  let tN = 0;
  let sD = denom;
  let tD = denom;

  const EPS = 1e-9;

  if (denom < EPS) {
    // Almost parallel
    sN = 0;
    sD = 1;
    tN = e;
    tD = c;
  } else {
    sN = b * e - c * d;
    tN = a * e - b * d;
    if (sN < 0) {
      sN = 0;
      tN = e;
      tD = c;
    } else if (sN > sD) {
      sN = sD;
      tN = e + b;
      tD = c;
    }
  }

  if (tN < 0) {
    tN = 0;
    if (-d < 0) sN = 0;
    else if (-d > a) sN = sD;
    else {
      sN = -d;
      sD = a;
    }
  } else if (tN > tD) {
    tN = tD;
    if (-d + b < 0) sN = 0;
    else if (-d + b > a) sN = sD;
    else {
      sN = -d + b;
      sD = a;
    }
  }

  const sc = Math.abs(sN) < EPS ? 0 : sN / sD;
  const tc = Math.abs(tN) < EPS ? 0 : tN / tD;

  const dP = _dP.copy(w0).addScaledVector(u, sc).addScaledVector(v, -tc);
  return dP.dot(dP);
}

export const SelfCollisionSystem = (props: {
  rotationNodes: Object3D[];
  thickness?: number; // world-space thickness used as diameter for collision distance
  minIndexGap?: number; // ignore pairs when |i-j| <= minIndexGap
  baseObject?: Object3D | null; // optional base collider target (for tip ↔ base)
  basePadding?: number; // inflate base collider radius
  baseMinLinkIndex?: number; // ignore base checks for links < this index
}) => {
  const setSelfCollision = useSimStore((s) => s.setSelfCollision);
  const thickness = props.thickness ?? 0.08;
  const minIndexGap = props.minIndexGap ?? 2;
  const radius = thickness * 0.5;
  const radiusSq = radius * radius;
  const basePadding = props.basePadding ?? 0.02;
  const baseMinLinkIndex = props.baseMinLinkIndex ?? 3;
  const baseRadiusRef = useRef<number | null>(null);

  const accum = useRef(0);
  const lastKeySigRef = useRef<string>('');

  useFrame((_, dt) => {
    accum.current += dt;
    if (accum.current < 1 / 20) return; // 20Hz
    accum.current = 0;

    const nodes = props.rotationNodes;
    if (!nodes || nodes.length < 2) {
      if (lastKeySigRef.current !== '') {
        lastKeySigRef.current = '';
        setSelfCollision({ pairs: [] });
      }
      return;
    }

    const linkCount = Math.max(0, nodes.length - 1);

    const pairs: SelfCollisionPair[] = [];
    const keys: string[] = [];

    // Base collider (sphere at Base pivot, radius derived from *base-only meshes* once).
    const baseObj = props.baseObject ?? null;
    if (baseObj) {
      baseObj.getWorldPosition(_baseCenter);
      if (baseRadiusRef.current == null) {
        // IMPORTANT: Base often contains the whole arm as children.
        // If we use setFromObject(baseObj), the bbox can include all links -> huge radius -> false positives at t=0.
        // We instead include meshes under Base but STOP traversing into any `_Rotation` subtrees.
        baseObj.updateMatrixWorld(true);
        _baseBox.makeEmpty();
        const stack: Object3D[] = [baseObj];
        while (stack.length) {
          const o = stack.pop()!;
          if (o !== baseObj && o.name && o.name.endsWith('_Rotation')) continue;
          // Mesh check (avoid importing Mesh type: duck-type geometry + boundingBox)
          const anyObj = o as unknown as { geometry?: unknown; matrixWorld?: Matrix4 };
          const geom = anyObj.geometry as unknown as { boundingBox?: Box3; computeBoundingBox?: () => void } | undefined;
          if (geom && typeof geom === 'object') {
            if (!geom.boundingBox) geom.computeBoundingBox?.();
            if (geom.boundingBox && anyObj.matrixWorld) {
              _tmpBox.copy(geom.boundingBox).applyMatrix4(anyObj.matrixWorld);
              _tmpMin.copy(_tmpBox.min);
              _tmpMax.copy(_tmpBox.max);
              _baseBox.expandByPoint(_tmpMin);
              _baseBox.expandByPoint(_tmpMax);
            }
          }
          for (const c of o.children) stack.push(c);
        }
        // If the filtered traversal excluded everything (common when meshes live under rotation nodes),
        // fall back to a reasonable default so Base collisions can still be detected.
        let r = 0.22;
        if (!_baseBox.isEmpty()) {
          _baseBox.getSize(_baseSize);
          const rr = 0.5 * Math.max(_baseSize.x, _baseSize.y, _baseSize.z);
          if (Number.isFinite(rr) && rr > 0) r = rr;
        }
        r += basePadding;
        baseRadiusRef.current = r;
      }
    } else {
      baseRadiusRef.current = null;
    }

    // Link ↔ Base checks (needed because Base mesh is not represented by link segments)
    if (baseObj && baseRadiusRef.current != null) {
      const baseR = baseRadiusRef.current;
      const thresholdSq = (baseR + radius) * (baseR + radius);
      for (let i = baseMinLinkIndex; i < linkCount; i++) {
        nodes[i]!.getWorldPosition(_p0);
        nodes[i + 1]!.getWorldPosition(_p1);
        const d2 = pointSegmentDistSq(_baseCenter, _p0, _p1);
        if (d2 > thresholdSq) continue;
        pairs.push({
          a: linkLabel(i),
          b: 'Base',
          aIndex: i,
          bIndex: -1,
        });
        keys.push(`${i}-base`);
      }
    }

    for (let i = 0; i < linkCount; i++) {
      for (let j = i + 1; j < linkCount; j++) {
        // Ignore near links to avoid constant overlaps around shared joints/housings.
        if (Math.abs(i - j) <= minIndexGap) continue;

        // Distance between link segments (pivot-to-pivot).
        nodes[i]!.getWorldPosition(_p0);
        nodes[i + 1]!.getWorldPosition(_p1);
        nodes[j]!.getWorldPosition(_p2);
        nodes[j + 1]!.getWorldPosition(_p3);

        const d2 = segmentSegmentDistSq(_p0, _p1, _p2, _p3);
        if (d2 > radiusSq) continue;
        pairs.push({
          a: linkLabel(i),
          b: linkLabel(j),
          aIndex: i,
          bIndex: j,
        });
        keys.push(`${i}-${j}`);
      }
    }

    keys.sort();
    const sig = keys.join('|');
    if (sig === lastKeySigRef.current) return;
    lastKeySigRef.current = sig;
    setSelfCollision({ pairs });
  });

  return null;
};

