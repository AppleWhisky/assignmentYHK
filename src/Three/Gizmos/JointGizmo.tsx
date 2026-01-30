import { TransformControls } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import type { Object3D } from 'three';
import { Quaternion, Vector3 } from 'three';
import type { TransformControls as TransformControlsImpl } from 'three-stdlib';
import { useSimStore } from '@/store/useSimStore';
import type { Axis } from '@/store/useSimStore';

const AXIS_VEC: Record<Axis, Vector3> = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
};

const _inv = new Quaternion();
const _delta = new Quaternion();
const _axis = new Vector3();

export const JointGizmo = (props: {
  jointNodeByName: Map<string, Object3D>;
  onDraggingChange?: (dragging: boolean) => void;
}) => {
  const selected = useSimStore((s) => s.selected);
  const joints = useSimStore((s) => s.joints);
  const setJointAngle = useSimStore((s) => s.setJointAngle);
  const setTransformInteracting = useSimStore((s) => s.setTransformInteracting);

  const selectedName = selected?.kind === 'joint' ? selected.name : null;
  const object = selectedName ? (props.jointNodeByName.get(selectedName) ?? null) : null;
  const joint = useMemo(
    () => joints.find((j) => j.name === selectedName) ?? null,
    [joints, selectedName],
  );

  const controlsRef = useRef<TransformControlsImpl | null>(null);
  const startQuatRef = useRef<Quaternion | null>(null);
  const startAngleRef = useRef<number>(0);
  const onDraggingChangeRef = useRef(props.onDraggingChange);

  useEffect(() => {
    onDraggingChangeRef.current = props.onDraggingChange;
  }, [props.onDraggingChange]);

  // Unmount safety only (do not run on re-render cleanups).
  useEffect(() => {
    return () => setTransformInteracting(false);
  }, [setTransformInteracting]);

  useEffect(() => {
    if (!controlsRef.current || !object || !joint) return;
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

    const onMouseDown = () => {
      startQuatRef.current = object.quaternion.clone();
      startAngleRef.current = joint.angleRad;
      setTransformInteracting(true);
    };
    const onObjectChange = () => {
      if (!startQuatRef.current) return;
      _inv.copy(startQuatRef.current).invert();
      _delta.copy(_inv).multiply(object.quaternion);

      // Signed angle around the configured axis (TransformControls is limited to 1 axis).
      const unitAxis = AXIS_VEC[joint.axis];
      _axis.set(_delta.x, _delta.y, _delta.z);
      const vLen = _axis.length();
      if (vLen < 1e-6) return;
      _axis.divideScalar(vLen);
      const angle = 2 * Math.atan2(vLen, _delta.w);
      const sign = Math.sign(unitAxis.dot(_axis)) || 1;
      setJointAngle(joint.name, startAngleRef.current + sign * angle);
    };
    const onDraggingChanged = (e: unknown) => {
      const v = (e as { value?: unknown } | null)?.value;
      const active = Boolean(v);
      onDraggingChangeRef.current?.(active);
      setTransformInteracting(active);
    };
    const onMouseUp = () => {
      onDraggingChangeRef.current?.(false);
      setTransformInteracting(false);
    };

    controlsAny.addEventListener('mouseDown', onMouseDown);
    controlsAny.addEventListener('mouseUp', onMouseUp);
    controlsAny.addEventListener('objectChange', onObjectChange);
    controlsAny.addEventListener('dragging-changed', onDraggingChanged);
    return () => {
      controlsAny.removeEventListener('mouseDown', onMouseDown);
      controlsAny.removeEventListener('mouseUp', onMouseUp);
      controlsAny.removeEventListener('objectChange', onObjectChange);
      controlsAny.removeEventListener('dragging-changed', onDraggingChanged);
    };
  }, [object, joint, setJointAngle, setTransformInteracting]);

  if (!object || !joint) return null;

  const show = { x: joint.axis === 'x', y: joint.axis === 'y', z: joint.axis === 'z' };
  return (
    <TransformControls
      ref={controlsRef}
      object={object}
      mode="rotate"
      space="local"
      showX={show.x}
      showY={show.y}
      showZ={show.z}
      size={1}
    />
  );
};
