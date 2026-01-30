import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Box3, Box3Helper, Color, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import { useSimStore } from '@/store/useSimStore';

const DEFAULT_COLOR = new Color('#6b7280'); // gray
const WARN_COLOR = new Color('#ff9a3d');
const COLLISION_COLOR = new Color('#ff4d5e');

const BoxForObject = (props: { object: Object3D; color: Color }) => {
  const box = useMemo(() => new Box3(), []);
  const helper = useMemo(() => {
    const h = new Box3Helper(box, props.color);
    h.renderOrder = 999;
    h.frustumCulled = false;
    // Make sure it's always visible like gizmos
    const matAny = h.material as unknown as { depthTest?: boolean; transparent?: boolean; opacity?: number };
    matAny.depthTest = false;
    matAny.transparent = true;
    matAny.opacity = 0.9;
    return h;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // keep one helper instance; we update its color below

  useFrame(() => {
    box.setFromObject(props.object);
    const mats = Array.isArray(helper.material) ? helper.material : [helper.material];
    for (const m of mats) {
      const mAny = m as unknown as { color?: Color };
      mAny.color?.copy(props.color);
    }
    helper.updateMatrixWorld(true);
  });

  return <primitive object={helper} />;
};

const BoxForMeshGeometry = (props: { mesh: Mesh; color: Color }) => {
  const box = useMemo(() => new Box3(), []);
  const helper = useMemo(() => {
    const h = new Box3Helper(box, props.color);
    h.renderOrder = 999;
    h.frustumCulled = false;
    const matAny = h.material as unknown as {
      depthTest?: boolean;
      transparent?: boolean;
      opacity?: number;
    };
    matAny.depthTest = false;
    matAny.transparent = true;
    matAny.opacity = 0.9;
    return h;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(() => {
    const g = props.mesh.geometry;
    if (!g.boundingBox) g.computeBoundingBox?.();
    if (!g.boundingBox) return;
    box.copy(g.boundingBox).applyMatrix4(props.mesh.matrixWorld);
    const mats = Array.isArray(helper.material) ? helper.material : [helper.material];
    for (const m of mats) {
      const mAny = m as unknown as { color?: Color };
      mAny.color?.copy(props.color);
    }
    helper.updateMatrixWorld(true);
  });

  return <primitive object={helper} />;
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
        return (
          <BoxForMeshGeometry
            key={`robotbox:${key}`}
            mesh={m}
            color={isHot ? COLLISION_COLOR : isWarn ? WARN_COLOR : DEFAULT_COLOR}
          />
        );
      })}
      {obstacleEntries.map(([id, obj]) => (
        <BoxForObject
          key={`obsbox:${id}`}
          object={obj}
          color={collidingObstacle.has(id) ? COLLISION_COLOR : warningObstacle.has(id) ? WARN_COLOR : DEFAULT_COLOR}
        />
      ))}
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

