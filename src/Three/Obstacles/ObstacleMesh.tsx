import { useEffect, useMemo, useRef } from 'react';
import type { Mesh } from 'three';
import { BoxGeometry, Color, MeshStandardMaterial } from 'three';
import type { ObstacleState } from '@/store/useSimStore';
import { useSimStore } from '@/store/useSimStore';

export const ObstacleMesh = (props: {
  obstacle: ObstacleState;
  registerObject: (id: string, obj: Mesh | null) => void;
}) => {
  const ref = useRef<Mesh | null>(null);
  const selected = useSimStore((s) => s.selected);
  const setSelected = useSimStore((s) => s.setSelected);
  const collision = useSimStore((s) => s.collision);

  const isSelected = selected?.kind === 'obstacle' && selected.id === props.obstacle.id;
  const isColliding = collision.collidingObstacleIds.includes(props.obstacle.id);
  const isWarning = !isColliding && collision.warningObstacleIds.includes(props.obstacle.id);

  const fillHex = isColliding ? '#ef4444' : isWarning ? '#f59e0b' : isSelected ? '#3b82f6' : '#e2e8f0';

  // Create once; update values to avoid GPU/material leaks.
  const material = useMemo(() => {
    const c = new Color('#e2e8f0');
    const m = new MeshStandardMaterial({
      color: c,
      transparent: false,
      opacity: 1,
      roughness: 0.55,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    m.emissive = c.clone();
    m.setValues({ emissiveIntensity: 0.08 });
    return m;
  }, []);

  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);

  useEffect(() => {
    material.color.set(fillHex);
    material.emissive.set(fillHex);
    material.setValues({ emissiveIntensity: isColliding ? 0.25 : isWarning ? 0.18 : 0.08 });
  }, [fillHex, isColliding, isWarning, material]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh
      ref={(m) => {
        ref.current = m;
        props.registerObject(props.obstacle.id, m);
      }}
      geometry={geometry}
      material={material}
      position={props.obstacle.position}
      rotation={props.obstacle.rotation}
      scale={props.obstacle.size}
      onPointerDown={(e) => {
        e.stopPropagation();

        // UX guard: don't steal selection while any gizmo is actively dragging.
        const s = useSimStore.getState();
        if (s.transformInteracting) return;

        setSelected({ kind: 'obstacle', id: props.obstacle.id });
      }}
      userData={{ kind: 'obstacle', id: props.obstacle.id }}
      renderOrder={5}
    />
  );
};
