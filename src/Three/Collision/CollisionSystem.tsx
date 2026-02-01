import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Material } from 'three';
import { Box3, Color, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import { useSimStore } from '@/store/useSimStore';
import type { ObstacleCollisionPair } from '@/store/useSimStore';

type SavedMaterial = {
  mat: Material;
  color?: Color;
  emissive?: Color;
  emissiveIntensity?: number;
};

const WARN_COLOR = new Color('#ff9a3d');
const COLLISION_COLOR = new Color('#ff4d5e');
const WARNING_MARGIN = 0.03;

const _tmp = new Box3();
const _t = new Vector3();

export const CollisionSystem = (props: {
  robotRoot: Object3D | null;
  obstacleObjectById: Map<string, Object3D>;
}) => {
  const setCollision = useSimStore((s) => s.setCollision);
  const severityRef = useRef<'none' | 'warning' | 'collision'>('none');

  const robotMeshes = useMemo(() => {
    if (!props.robotRoot) return [] as Mesh[];
    return collectRobotMeshes(props.robotRoot);
  }, [props.robotRoot]);

  const saved = useRef<WeakMap<Mesh, SavedMaterial[]>>(new WeakMap());

  useEffect(() => {
    // Seed saved material snapshots
    for (const mesh of robotMeshes) {
      if (!saved.current.has(mesh)) {
        saved.current.set(mesh, snapshotMaterials(mesh.material));
      }
    }
  }, [robotMeshes]);

  const accum = useRef(0);

  useFrame((_, dt) => {
    accum.current += dt;
    if (accum.current < 1 / 20) return; // 20Hz
    accum.current = 0;

    if (!props.robotRoot) return;

    const obstacleEntries = Array.from(props.obstacleObjectById.entries());
    if (obstacleEntries.length === 0) {
      if (severityRef.current !== 'none') {
        severityRef.current = 'none';
        setCollision({
          severity: 'none',
          warningMeshNames: [],
          collidingMeshNames: [],
          warningObstacleIds: [],
          collidingObstacleIds: [],
        });
      }
      restoreAll(robotMeshes, saved.current);
      return;
    }

    const warningMeshes = new Set<string>();
    const collidingMeshes = new Set<string>();
    const warningObstacles = new Set<string>();
    const collidingObstacles = new Set<string>();
    const warningPairs = new Set<string>();
    const collidingPairs = new Set<string>();

    const obstacleInfo = obstacleEntries.map(([id, obj]) => {
      obj.updateWorldMatrix(true, false);
      const obb = getObjectWorldObb(obj);
      return { id, obj, obb };
    });

    for (const mesh of robotMeshes) {
      const meshObb = getMeshWorldObb(mesh);
      if (!meshObb) continue;

      for (const info of obstacleInfo) {
        if (!info.obb) continue;

        const intersects = obbIntersectsObb(meshObb, info.obb);
        if (intersects) {
          const meshKey = mesh.name || mesh.uuid;
          collidingMeshes.add(meshKey);
          collidingObstacles.add(info.id);
          collidingPairs.add(`${meshKey}::${info.id}`);
        } else {
          const warn = obbIntersectsObb(meshObb, expandObb(info.obb, WARNING_MARGIN));
          if (warn) {
            const meshKey = mesh.name || mesh.uuid;
            warningMeshes.add(meshKey);
            warningObstacles.add(info.id);
            warningPairs.add(`${meshKey}::${info.id}`);
          }
        }
      }
    }

    const severity =
      collidingMeshes.size > 0 ? 'collision' : warningMeshes.size > 0 ? 'warning' : 'none';

    if (severityRef.current !== severity) {
      severityRef.current = severity;
    }

    setCollision({
      severity,
      warningMeshNames: Array.from(warningMeshes),
      collidingMeshNames: Array.from(collidingMeshes),
      warningObstacleIds: Array.from(warningObstacles),
      collidingObstacleIds: Array.from(collidingObstacles),
      warningPairs: Array.from(warningPairs).map((k) => {
        const [mesh, obstacleId] = k.split('::');
        return { mesh: mesh ?? '', obstacleId: obstacleId ?? '' } satisfies ObstacleCollisionPair;
      }),
      collidingPairs: Array.from(collidingPairs).map((k) => {
        const [mesh, obstacleId] = k.split('::');
        return { mesh: mesh ?? '', obstacleId: obstacleId ?? '' } satisfies ObstacleCollisionPair;
      }),
    });

    applyTint(robotMeshes, saved.current, collidingMeshes, warningMeshes);
  });

  return null;
};

type OBB = {
  c: Vector3;
  u0: Vector3;
  u1: Vector3;
  u2: Vector3;
  half: [number, number, number];
};

function expandObb(obb: OBB, margin: number): OBB {
  return {
    c: obb.c,
    u0: obb.u0,
    u1: obb.u1,
    u2: obb.u2,
    half: [obb.half[0] + margin, obb.half[1] + margin, obb.half[2] + margin],
  };
}

function getObjectWorldObb(obj: Object3D): OBB | null {
  if (obj instanceof Mesh) return getMeshWorldObb(obj);
  // Fallback: world-aligned OBB from AABB.
  _tmp.setFromObject(obj);
  if (_tmp.isEmpty()) return null;
  _tmp.getCenter(_fallbackCenter);
  _tmp.getSize(_fallbackSize);
  return {
    c: _fallbackCenter.clone(),
    u0: _axisX.clone(),
    u1: _axisY.clone(),
    u2: _axisZ.clone(),
    half: [_fallbackSize.x * 0.5, _fallbackSize.y * 0.5, _fallbackSize.z * 0.5],
  };
}

const _fallbackCenter = new Vector3();
const _fallbackSize = new Vector3();
const _axisX = new Vector3(1, 0, 0);
const _axisY = new Vector3(0, 1, 0);
const _axisZ = new Vector3(0, 0, 1);

const _lc = new Vector3();
const _ls = new Vector3();
const _wx = new Vector3();
const _wy = new Vector3();
const _wz = new Vector3();

function getMeshWorldObb(mesh: Mesh): OBB | null {
  const g = mesh.geometry;
  if (!g) return null;
  if (!g.boundingBox) g.computeBoundingBox?.();
  const bb = g.boundingBox;
  if (!bb) return null;

  mesh.updateWorldMatrix(true, false);

  bb.getCenter(_lc);
  bb.getSize(_ls).multiplyScalar(0.5);

  // Extract world axes (including scale) from matrixWorld columns
  const e = mesh.matrixWorld.elements;
  _wx.set(e[0], e[1], e[2]);
  _wy.set(e[4], e[5], e[6]);
  _wz.set(e[8], e[9], e[10]);

  const sx = _wx.length();
  const sy = _wy.length();
  const sz = _wz.length();
  if (sx <= 0 || sy <= 0 || sz <= 0) return null;

  const u0 = _wx.clone().multiplyScalar(1 / sx);
  const u1 = _wy.clone().multiplyScalar(1 / sy);
  const u2 = _wz.clone().multiplyScalar(1 / sz);

  const c = _lc.clone().applyMatrix4(mesh.matrixWorld);
  return {
    c,
    u0,
    u1,
    u2,
    half: [_ls.x * sx, _ls.y * sy, _ls.z * sz],
  };
}

function obbIntersectsObb(a: OBB, b: OBB) {
  // SAT OBB vs OBB (Ericson). Uses global scratch _t for translation in A frame.
  const EPS = 1e-7;

  // Rotation matrix from B into A: R[i][j] = dot(Ai, Bj)
  const R00 = a.u0.dot(b.u0), R01 = a.u0.dot(b.u1), R02 = a.u0.dot(b.u2);
  const R10 = a.u1.dot(b.u0), R11 = a.u1.dot(b.u1), R12 = a.u1.dot(b.u2);
  const R20 = a.u2.dot(b.u0), R21 = a.u2.dot(b.u1), R22 = a.u2.dot(b.u2);

  const AR00 = Math.abs(R00) + EPS, AR01 = Math.abs(R01) + EPS, AR02 = Math.abs(R02) + EPS;
  const AR10 = Math.abs(R10) + EPS, AR11 = Math.abs(R11) + EPS, AR12 = Math.abs(R12) + EPS;
  const AR20 = Math.abs(R20) + EPS, AR21 = Math.abs(R21) + EPS, AR22 = Math.abs(R22) + EPS;

  // Translation t in A frame
  _t.copy(b.c).sub(a.c);
  const t0 = _t.dot(a.u0);
  const t1 = _t.dot(a.u1);
  const t2 = _t.dot(a.u2);

  const Ax = a.half[0], Ay = a.half[1], Az = a.half[2];
  const Bx = b.half[0], By = b.half[1], Bz = b.half[2];

  // Test A axes
  let ra = Ax;
  let rb = Bx * AR00 + By * AR01 + Bz * AR02;
  if (Math.abs(t0) > ra + rb) return false;

  ra = Ay;
  rb = Bx * AR10 + By * AR11 + Bz * AR12;
  if (Math.abs(t1) > ra + rb) return false;

  ra = Az;
  rb = Bx * AR20 + By * AR21 + Bz * AR22;
  if (Math.abs(t2) > ra + rb) return false;

  // Test B axes
  const tB0 = t0 * R00 + t1 * R10 + t2 * R20;
  ra = Ax * AR00 + Ay * AR10 + Az * AR20;
  rb = Bx;
  if (Math.abs(tB0) > ra + rb) return false;

  const tB1 = t0 * R01 + t1 * R11 + t2 * R21;
  ra = Ax * AR01 + Ay * AR11 + Az * AR21;
  rb = By;
  if (Math.abs(tB1) > ra + rb) return false;

  const tB2 = t0 * R02 + t1 * R12 + t2 * R22;
  ra = Ax * AR02 + Ay * AR12 + Az * AR22;
  rb = Bz;
  if (Math.abs(tB2) > ra + rb) return false;

  // Test cross products Ai x Bj
  // A0 x B0
  ra = Ay * AR20 + Az * AR10;
  rb = By * AR02 + Bz * AR01;
  if (Math.abs(t2 * R10 - t1 * R20) > ra + rb) return false;
  // A0 x B1
  ra = Ay * AR21 + Az * AR11;
  rb = Bx * AR02 + Bz * AR00;
  if (Math.abs(t2 * R11 - t1 * R21) > ra + rb) return false;
  // A0 x B2
  ra = Ay * AR22 + Az * AR12;
  rb = Bx * AR01 + By * AR00;
  if (Math.abs(t2 * R12 - t1 * R22) > ra + rb) return false;

  // A1 x B0
  ra = Ax * AR20 + Az * AR00;
  rb = By * AR12 + Bz * AR11;
  if (Math.abs(t0 * R20 - t2 * R00) > ra + rb) return false;
  // A1 x B1
  ra = Ax * AR21 + Az * AR01;
  rb = Bx * AR12 + Bz * AR10;
  if (Math.abs(t0 * R21 - t2 * R01) > ra + rb) return false;
  // A1 x B2
  ra = Ax * AR22 + Az * AR02;
  rb = Bx * AR11 + By * AR10;
  if (Math.abs(t0 * R22 - t2 * R02) > ra + rb) return false;

  // A2 x B0
  ra = Ax * AR10 + Ay * AR00;
  rb = By * AR22 + Bz * AR21;
  if (Math.abs(t1 * R00 - t0 * R10) > ra + rb) return false;
  // A2 x B1
  ra = Ax * AR11 + Ay * AR01;
  rb = Bx * AR22 + Bz * AR20;
  if (Math.abs(t1 * R01 - t0 * R11) > ra + rb) return false;
  // A2 x B2
  ra = Ax * AR12 + Ay * AR02;
  rb = Bx * AR21 + By * AR20;
  if (Math.abs(t1 * R02 - t0 * R12) > ra + rb) return false;

  return true;
}

function restoreAll(meshes: Mesh[], saved: WeakMap<Mesh, SavedMaterial[]>) {
  for (const mesh of meshes) {
    const snapshots = saved.get(mesh);
    if (!snapshots) continue;
    for (const s of snapshots) restoreSnapshot(s);
  }
}

function applyTint(
  meshes: Mesh[],
  saved: WeakMap<Mesh, SavedMaterial[]>,
  colliding: Set<string>,
  warning: Set<string>,
) {
  for (const mesh of meshes) {
    const key = mesh.name || mesh.uuid;
    const snapshots = saved.get(mesh);
    if (!snapshots) continue;

    if (colliding.has(key)) {
      for (const s of snapshots) tintSnapshot(s, COLLISION_COLOR, 0.35);
    } else if (warning.has(key)) {
      for (const s of snapshots) tintSnapshot(s, WARN_COLOR, 0.25);
    } else {
      for (const s of snapshots) restoreSnapshot(s);
    }
  }
}

function snapshotMaterials(m: Mesh['material']): SavedMaterial[] {
  const mats = Array.isArray(m) ? m : [m];
  return mats.map((mat) => {
    const matAny = mat as unknown as {
      color?: Color;
      emissive?: Color;
      emissiveIntensity?: number;
    };
    return {
      mat,
      color: matAny.color?.clone(),
      emissive: matAny.emissive?.clone(),
      emissiveIntensity: typeof matAny.emissiveIntensity === 'number' ? matAny.emissiveIntensity : undefined,
    };
  });
}

function restoreSnapshot(s: SavedMaterial) {
  const matAny = s.mat as unknown as {
    color?: Color;
    emissive?: Color;
    emissiveIntensity?: number;
  };
  if (s.color && matAny.color) matAny.color.copy(s.color);
  if (s.emissive && matAny.emissive) matAny.emissive.copy(s.emissive);
  if (typeof s.emissiveIntensity === 'number' && typeof matAny.emissiveIntensity === 'number') {
    matAny.emissiveIntensity = s.emissiveIntensity;
  }
}

function tintSnapshot(s: SavedMaterial, c: Color, emissiveIntensity: number) {
  const matAny = s.mat as unknown as {
    color?: Color;
    emissive?: Color;
    emissiveIntensity?: number;
  };
  if (matAny.color) matAny.color.copy(c);
  if (matAny.emissive) matAny.emissive.copy(c);
  if (typeof matAny.emissiveIntensity === 'number') matAny.emissiveIntensity = emissiveIntensity;
}

function collectRobotMeshes(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    if (!obj.geometry) return;
    meshes.push(obj);
  });
  return meshes;
}
