import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Material } from 'three';
import { Box3, Color, Mesh } from 'three';
import type { Object3D } from 'three';
import { useSimStore } from '@/store/useSimStore';
import { boxDistance } from '@/utils/box';
import type { ObstacleCollisionPair } from '@/store/useSimStore';

type SavedMaterial = {
  mat: Material;
  color?: Color;
  emissive?: Color;
  emissiveIntensity?: number;
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

    for (const mesh of robotMeshes) {
      if (!mesh.geometry) continue;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox?.();
      if (!mesh.geometry.boundingBox) continue;
      _boxA.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);

      for (const [id, obj] of obstacleEntries) {
        // Robust AABB even if obstacle rotates/scales
        _tmp.setFromObject(obj);
        _boxB.copy(_tmp);

        if (_boxA.intersectsBox(_boxB)) {
          const meshKey = mesh.name || mesh.uuid;
          collidingMeshes.add(meshKey);
          collidingObstacles.add(id);
          collidingPairs.add(`${meshKey}::${id}`);
        } else {
          const d = boxDistance(_boxA, _boxB);
          if (d < 0.03) {
            const meshKey = mesh.name || mesh.uuid;
            warningMeshes.add(meshKey);
            warningObstacles.add(id);
            warningPairs.add(`${meshKey}::${id}`);
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
