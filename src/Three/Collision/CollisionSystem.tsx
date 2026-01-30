import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Box3, Color, Mesh, MeshStandardMaterial } from 'three';
import type { Object3D } from 'three';
import { useSimStore } from '@/store/useSimStore';
import { boxDistance } from '@/utils/box';

type SavedMaterial = {
  mat: MeshStandardMaterial;
  color: Color;
  emissive: Color;
  emissiveIntensity: number;
};

const WARN_COLOR = new Color('#ff9a3d');
const COLLISION_COLOR = new Color('#ff4d5e');

const _boxA = new Box3();
const _boxB = new Box3();
const _tmp = new Box3();

export const CollisionSystem = (props: {
  robotRoot: Object3D | null;
  obstacleObjectById: Map<string, Object3D>;
}) => {
  const setCollision = useSimStore((s) => s.setCollision);
  const severityRef = useRef<'none' | 'warning' | 'collision'>('none');

  const robotMeshes = useMemo(() => {
    if (!props.robotRoot) return [] as Mesh[];
    const meshes: Mesh[] = [];
    props.robotRoot.traverse((obj) => {
      if (obj instanceof Mesh) meshes.push(obj);
    });
    for (const m of meshes) {
      if (m.geometry && !m.geometry.boundingBox) m.geometry.computeBoundingBox?.();
    }
    return meshes;
  }, [props.robotRoot]);

  const saved = useRef<WeakMap<Mesh, SavedMaterial>>(new WeakMap());

  useEffect(() => {
    // Seed saved material snapshots
    for (const mesh of robotMeshes) {
      const mat = mesh.material;
      if (!(mat instanceof MeshStandardMaterial)) continue;
      if (!saved.current.has(mesh)) {
        saved.current.set(mesh, {
          mat,
          color: mat.color.clone(),
          emissive: mat.emissive.clone(),
          emissiveIntensity: mat.emissiveIntensity,
        });
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
        setCollision({ severity: 'none', collidingMeshNames: [], collidingObstacleIds: [] });
      }
      restoreAll(robotMeshes, saved.current);
      return;
    }

    const warningMeshes = new Set<string>();
    const collidingMeshes = new Set<string>();
    const warningObstacles = new Set<string>();
    const collidingObstacles = new Set<string>();

    for (const mesh of robotMeshes) {
      if (!mesh.geometry?.boundingBox) continue;
      _boxA.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);

      for (const [id, obj] of obstacleEntries) {
        // Robust AABB even if obstacle rotates/scales
        _tmp.setFromObject(obj);
        _boxB.copy(_tmp);

        if (_boxA.intersectsBox(_boxB)) {
          collidingMeshes.add(mesh.name || mesh.uuid);
          collidingObstacles.add(id);
        } else {
          const d = boxDistance(_boxA, _boxB);
          if (d < 0.03) {
            warningMeshes.add(mesh.name || mesh.uuid);
            warningObstacles.add(id);
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
      collidingMeshNames: Array.from(severity === 'collision' ? collidingMeshes : warningMeshes),
      collidingObstacleIds: Array.from(
        severity === 'collision' ? collidingObstacles : warningObstacles,
      ),
    });

    applyTint(robotMeshes, saved.current, collidingMeshes, warningMeshes);
  });

  return null;
};

function restoreAll(meshes: Mesh[], saved: WeakMap<Mesh, SavedMaterial>) {
  for (const mesh of meshes) {
    const snapshot = saved.get(mesh);
    if (!snapshot) continue;
    snapshot.mat.color.copy(snapshot.color);
    snapshot.mat.emissive.copy(snapshot.emissive);
    snapshot.mat.emissiveIntensity = snapshot.emissiveIntensity;
  }
}

function applyTint(
  meshes: Mesh[],
  saved: WeakMap<Mesh, SavedMaterial>,
  colliding: Set<string>,
  warning: Set<string>,
) {
  for (const mesh of meshes) {
    const mat = mesh.material;
    if (!(mat instanceof MeshStandardMaterial)) continue;
    const key = mesh.name || mesh.uuid;
    const snapshot = saved.get(mesh);
    if (!snapshot) continue;

    if (colliding.has(key)) {
      mat.color.copy(COLLISION_COLOR);
      mat.emissive.copy(COLLISION_COLOR);
      mat.emissiveIntensity = 0.35;
    } else if (warning.has(key)) {
      mat.color.copy(WARN_COLOR);
      mat.emissive.copy(WARN_COLOR);
      mat.emissiveIntensity = 0.25;
    } else {
      mat.color.copy(snapshot.color);
      mat.emissive.copy(snapshot.emissive);
      mat.emissiveIntensity = snapshot.emissiveIntensity;
    }
  }
}
