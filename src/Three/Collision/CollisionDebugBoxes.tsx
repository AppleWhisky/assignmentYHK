import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { LineSegments } from 'three';
import { Box3, BoxGeometry, Color, EdgesGeometry, LineBasicMaterial, Matrix4, Mesh, Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';
import { useSimStore } from '@/store/useSimStore';

const DEFAULT_COLOR = new Color('#6b7280'); // gray
const WARN_COLOR = new Color('#ff9a3d');
const COLLISION_COLOR = new Color('#ff4d5e');

type OBB = {
  c: Vector3;
  u0: Vector3;
  u1: Vector3;
  u2: Vector3;
  half: [number, number, number];
};

const ObbWireBox = (props: { obb: OBB | null; color: Color }) => {
  const ref = useRef<LineSegments | null>(null);
  const geom = useMemo(() => new EdgesGeometry(new BoxGeometry(1, 1, 1)), []);
  const mat = useMemo(() => {
    const m = new LineBasicMaterial({ color: props.color, transparent: true, opacity: 0.9 });
    m.depthTest = false;
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // keep material instance; we update color below

  useEffect(() => {
    return () => {
      geom.dispose();
      mat.dispose();
    };
  }, [geom, mat]);

  useFrame(() => {
    const o = props.obb;
    const obj = ref.current;
    if (!obj || !o) return;

    mat.color.copy(props.color);

    _basis.makeBasis(o.u0, o.u1, o.u2);
    _quat.setFromRotationMatrix(_basis);
    obj.position.copy(o.c);
    obj.quaternion.copy(_quat);
    obj.scale.set(o.half[0] * 2, o.half[1] * 2, o.half[2] * 2);
    obj.updateMatrixWorld(true);
  });

  if (!props.obb) return null;
  return (
    <lineSegments
      ref={ref}
      geometry={geom}
      material={mat}
      frustumCulled={false}
      renderOrder={999}
    />
  );
};

export const CollisionDebugBoxes = (props: {
  robotRoot: Object3D | null;
  obstacleObjectById: Map<string, Object3D>;
}) => {
  const show = useSimStore((s) => s.showCollisionBoxes);
  const collision = useSimStore((s) => s.collision);

  const robotMeshes = useMemo(() => {
    if (!props.robotRoot) return [] as Mesh[];
    return collectRobotMeshes(props.robotRoot);
  }, [props.robotRoot]);

  const obstacleEntries = useMemo(
    () => Array.from(props.obstacleObjectById.entries()),
    [props.obstacleObjectById],
  );

  const didLogRef = useRef(false);
  useEffect(() => {
    if (!show) {
      didLogRef.current = false;
      return;
    }
    if (didLogRef.current) return;
    didLogRef.current = true;

    // Quick one-time diagnostic to help understand GLB structure.
    console.groupCollapsed('[CollisionDebugBoxes] robot mesh list');
    for (const m of robotMeshes) {
      if (!m.geometry) continue;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox?.();
      const bb = m.geometry.boundingBox;
      if (!bb) continue;
      const s = bb.getSize(_tmpSize);
      console.log(m.name || m.uuid, 'localBBoxSize', { x: s.x, y: s.y, z: s.z });
    }
    console.groupEnd();
  }, [robotMeshes, show]);

  if (!show) return null;

  const hotMeshes = new Set(collision.collidingMeshNames);
  const warnMeshes = new Set(collision.warningMeshNames);
  const collidingObstacle = new Set(collision.collidingObstacleIds);
  const warningObstacle = new Set(collision.warningObstacleIds);

  return (
    <>
      {robotMeshes.map((m) => {
        const key = m.name || m.uuid;
        const isHot = hotMeshes.has(key);
        const isWarn = !isHot && warnMeshes.has(key);
        const obb = getMeshWorldObb(m);
        return (
          <ObbWireBox
            key={`robotbox:${key}`}
            color={isHot ? COLLISION_COLOR : isWarn ? WARN_COLOR : DEFAULT_COLOR}
            obb={obb}
          />
        );
      })}
      {obstacleEntries.map(([id, obj]) => {
        const obb = getObjectWorldObb(obj);
        return (
          <ObbWireBox
            key={`obsbox:${id}`}
            obb={obb}
            color={collidingObstacle.has(id) ? COLLISION_COLOR : warningObstacle.has(id) ? WARN_COLOR : DEFAULT_COLOR}
          />
        );
      })}
    </>
  );
};

function collectRobotMeshes(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    if (!obj.geometry) return;
    meshes.push(obj);
  });
  return meshes;
}

const _tmpSize = new Vector3();

const _lc = new Vector3();
const _ls = new Vector3();
const _wx = new Vector3();
const _wy = new Vector3();
const _wz = new Vector3();
const _fallbackCenter = new Vector3();
const _fallbackSize = new Vector3();
const _axisX = new Vector3(1, 0, 0);
const _axisY = new Vector3(0, 1, 0);
const _axisZ = new Vector3(0, 0, 1);
const _basis = new Matrix4();
const _quat = new Quaternion();
const _tmpBox = new Box3();

function getObjectWorldObb(obj: Object3D): OBB | null {
  if (obj instanceof Mesh) return getMeshWorldObb(obj);
  _tmpBox.setFromObject(obj);
  if (_tmpBox.isEmpty()) return null;
  _tmpBox.getCenter(_fallbackCenter);
  _tmpBox.getSize(_fallbackSize);
  return {
    c: _fallbackCenter.clone(),
    u0: _axisX.clone(),
    u1: _axisY.clone(),
    u2: _axisZ.clone(),
    half: [_fallbackSize.x * 0.5, _fallbackSize.y * 0.5, _fallbackSize.z * 0.5],
  };
}

function getMeshWorldObb(mesh: Mesh): OBB | null {
  const g = mesh.geometry;
  if (!g) return null;
  if (!g.boundingBox) g.computeBoundingBox?.();
  const bb = g.boundingBox;
  if (!bb) return null;

  mesh.updateWorldMatrix(true, false);

  bb.getCenter(_lc);
  bb.getSize(_ls).multiplyScalar(0.5);

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

