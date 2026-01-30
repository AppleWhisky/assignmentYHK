import type { Object3D } from 'three';
import { useMemo } from 'react';
import { ObstacleMesh } from '@/Three/Obstacles/ObstacleMesh';
import { useSimStore } from '@/store/useSimStore';

export const ObstaclesLayer = (props: { obstacleObjectById: Map<string, Object3D> }) => {
  const obstacles = useSimStore((s) => s.obstacles);
  const bumpObstacleRegistryVersion = useSimStore((s) => s.bumpObstacleRegistryVersion);

  const registerObject = useMemo(
    () => (id: string, obj: Object3D | null) => {
      if (!obj) props.obstacleObjectById.delete(id);
      else props.obstacleObjectById.set(id, obj);
      bumpObstacleRegistryVersion();
    },
    [bumpObstacleRegistryVersion, props.obstacleObjectById],
  );

  return (
    <>
      {obstacles.map((o) => (
        <ObstacleMesh key={o.id} obstacle={o} registerObject={registerObject} />
      ))}
    </>
  );
};
