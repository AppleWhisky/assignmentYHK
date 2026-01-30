import { useEffect, useMemo, useRef } from 'react';
import type { Object3D, Quaternion } from 'three';
import arm01Url from '@/assets/arm01.glb?url';
import { useObjectGLTF, preloadObjectGLTF } from '@/Three/loaders/ObjectLoader';
import { buildArm01Rig } from '@/Three/Robot/Arm01Rig';
import type { Axis } from '@/store/useSimStore';
import { useSimStore } from '@/store/useSimStore';

export type RobotRuntime = {
  root: Object3D;
  rotationNodes: Object3D[];
  jointByName: Map<
    string,
    {
      object: Object3D;
      baseQuat: Quaternion;
    }
  >;
};

preloadObjectGLTF(arm01Url);

export const RobotLoader = (props: { onReady?: (rt: RobotRuntime) => void }) => {
  const gltf = useObjectGLTF(arm01Url);
  const axisOverrides = useSimStore((s) => s.jointAxisOverrides);
  const setJoints = useSimStore((s) => s.setJoints);
  const setSelected = useSimStore((s) => s.setSelected);
  const setJointGizmoActive = useSimStore((s) => s.setJointGizmoActive);
  const onReadyRef = useRef(props.onReady);
  const didNotifyRef = useRef(false);

  useEffect(() => {
    onReadyRef.current = props.onReady;
  }, [props.onReady]);

  const runtime = useMemo<RobotRuntime>(() => {
    const root = gltf.scene;
    // Rotation nodes are structural; they do not depend on axis overrides.
    const { rotationNodes } = buildArm01Rig(root, {} as Record<string, Axis>);
    const jointByName = new Map<string, { object: Object3D; baseQuat: Quaternion }>();
    for (const n of rotationNodes) {
      jointByName.set(n.name, { object: n, baseQuat: n.quaternion.clone() });
    }
    return { root, rotationNodes, jointByName };
  }, [gltf.scene]);

  useEffect(() => {
    const rig = buildArm01Rig(runtime.root, axisOverrides as Record<string, Axis>);
    setJoints(rig.joints);
  }, [axisOverrides, runtime.root, setJoints]);

  useEffect(() => {
    if (didNotifyRef.current) return;
    didNotifyRef.current = true;
    onReadyRef.current?.(runtime);
  }, [runtime]);

  return (
    <primitive
      object={runtime.root}
      onPointerDown={(e: unknown) => {
        (e as { stopPropagation?: () => void } | null)?.stopPropagation?.();
        setJointGizmoActive(false);
        setSelected({ kind: 'robot' });
      }}
    />
  );
};
