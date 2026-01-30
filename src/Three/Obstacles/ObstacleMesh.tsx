import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
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

  const isSelected = selected?.kind === 'obstacle' && selected.id === props.obstacle.id;
  const material = useMemo(() => {
    const c = new Color(isSelected ? '#77a7ff' : '#ffffff');
    const m = new MeshStandardMaterial({
      color: c,
      transparent: true,
      opacity: 0.35,
      roughness: 0.35,
      metalness: 0.05,
    });
    m.emissive = c;
    m.emissiveIntensity = isSelected ? 0.12 : 0.05;
    return m;
  }, [isSelected]);

  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);

  useFrame(() => {
    if (!ref.current) return;
    props.registerObject(props.obstacle.id, ref.current);
  });

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
    />
  );
};
