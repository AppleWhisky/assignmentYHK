import { TransformControls } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import type { Object3D } from 'three';
import { Euler } from 'three';
import type { TransformControls as TransformControlsImpl } from 'three-stdlib';
import { useSimStore } from '@/store/useSimStore';

const _e = new Euler();

export const ObstacleGizmo = (props: {
  obstacleObjectById: Map<string, Object3D>;
  onDraggingChange?: (dragging: boolean) => void;
}) => {
  const selected = useSimStore((s) => s.selected);
  const updateObstaclePose = useSimStore((s) => s.updateObstaclePose);
  const setTransformInteracting = useSimStore((s) => s.setTransformInteracting);

  const selectedId = selected?.kind === 'obstacle' ? selected.id : null;
  const object = selectedId ? (props.obstacleObjectById.get(selectedId) ?? null) : null;

  const controlsRef = useRef<TransformControlsImpl | null>(null);

  useEffect(() => {
    if (!controlsRef.current || !object || !selectedId) return;
    const controls = controlsRef.current;
    const controlsAny = controls as unknown as {
      addEventListener: (type: string, listener: (event?: unknown) => void) => void;
      removeEventListener: (type: string, listener: (event?: unknown) => void) => void;
    };

    // Ensure gizmo is visible even when embedded in meshes.
    (controls as unknown as Object3D).traverse((obj) => {
      const mat = (obj as { material?: unknown }).material;
      if (!mat) return;
      if (Array.isArray(mat)) {
        for (const m of mat) {
          if (!m || typeof m !== 'object') continue;
          (m as { depthTest?: boolean }).depthTest = false;
          (m as { depthWrite?: boolean }).depthWrite = false;
        }
      } else {
        if (typeof mat !== 'object') return;
        (mat as { depthTest?: boolean }).depthTest = false;
        (mat as { depthWrite?: boolean }).depthWrite = false;
      }
    });
    const onObjectChange = () => {
      _e.setFromQuaternion(object.quaternion, 'XYZ');
      updateObstaclePose(selectedId, {
        position: [object.position.x, object.position.y, object.position.z],
        rotation: [_e.x, _e.y, _e.z],
      });
    };
    const onDraggingChanged = (e: unknown) => {
      const v = (e as { value?: unknown } | null)?.value;
      const active = Boolean(v);
      props.onDraggingChange?.(active);
      setTransformInteracting(active);
    };
    const onMouseDown = () => {
      props.onDraggingChange?.(true);
      setTransformInteracting(true);
    };
    const onMouseUp = () => {
      props.onDraggingChange?.(false);
      setTransformInteracting(false);
    };
    controlsAny.addEventListener('objectChange', onObjectChange);
    controlsAny.addEventListener('dragging-changed', onDraggingChanged);
    controlsAny.addEventListener('mouseDown', onMouseDown);
    controlsAny.addEventListener('mouseUp', onMouseUp);
    return () => {
      controlsAny.removeEventListener('objectChange', onObjectChange);
      controlsAny.removeEventListener('dragging-changed', onDraggingChanged);
      controlsAny.removeEventListener('mouseDown', onMouseDown);
      controlsAny.removeEventListener('mouseUp', onMouseUp);
    };
  }, [object, props, selectedId, setTransformInteracting, updateObstaclePose]);

  if (!object) return null;
  return (
    <TransformControls ref={controlsRef} object={object} mode="translate" space="world" size={1} />
  );
};
