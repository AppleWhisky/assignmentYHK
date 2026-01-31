import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, TransformControls } from '@react-three/drei';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Object3D } from 'three';
import { Box3, Color, Vector3 } from 'three';
import type { TransformControls as TransformControlsImpl } from 'three-stdlib';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useSimStore } from '@/store/useSimStore';
import { RobotLoader, type RobotRuntime } from '@/Three/Robot/RobotLoader';
import { buildArm01Rig } from '@/Three/Robot/Arm01Rig';
import { applyJointAngle } from '@/Three/Robot/applyJointAngles';
import { JointHandles } from '@/Three/Gizmos/JointHandles';
import { JointGizmo } from '@/Three/Gizmos/JointGizmo';
import { ObstaclesLayer } from '@/Three/Obstacles/ObstaclesLayer';
import { ObstacleGizmo } from '@/Three/Gizmos/ObstacleGizmo';
import { CollisionSystem } from '@/Three/Collision/CollisionSystem';
import { CollisionDebugBoxes } from '@/Three/Collision/CollisionDebugBoxes';
import { Light } from '@/Three/Light';
import { AnimationPlayer } from '@/Three/Animation/AnimationPlayer';

const NO_RAYCAST = () => {
  // Intentionally empty: disables hit-testing for this object
};

export const RobotScene = () => {
  return (
    <Canvas
      shadows
      frameloop="demand"
      camera={{ position: [2.5, 2.5, 2.5], fov: 60, near: 0.01, far: 200 }}
      onPointerMissed={() => {
        // TransformControls uses DOM events and can cause R3F to see a "miss" while interacting.
        // Delay the clear one tick; if a transform interaction starts, skip clearing.
        window.setTimeout(() => {
          const s = useSimStore.getState();
          if (s.transformInteracting) return;
          s.setTransformInteracting(false);
          s.setJointGizmoActive(false);
          s.setSelected(null);
        }, 0);
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(new Color('#0b1020'), 1);
      }}
    >
      <Suspense fallback={null}>
        <SceneContents />
      </Suspense>
    </Canvas>
  );
};

const _box = new Box3();
const _size = new Vector3();
const _pivotBox = new Box3();
const _pivotCenter = new Vector3();

const SceneContents = () => {
  const { camera, gl } = useThree();
  const setThree = useSimStore((s) => s.setThree);
  const setOrbitControls = useSimStore((s) => s.setOrbitControls);
  useEffect(() => setThree({ camera, gl }), [camera, gl, setThree]);
  const orbitRef = useRef<OrbitControlsImpl | null>(null);
  const didSaveOrbitRef = useRef(false);
  useEffect(() => {
    const o = orbitRef.current;
    setOrbitControls(o);
    if (!o) return;
    if (didSaveOrbitRef.current) return;
    didSaveOrbitRef.current = true;
    o.saveState();
  }, [setOrbitControls]);

  const joints = useSimStore((s) => s.joints);
  const axisOverrides = useSimStore((s) => s.jointAxisOverrides);
  const selected = useSimStore((s) => s.selected);
  const jointGizmoActive = useSimStore((s) => s.jointGizmoActive);
  const robotPosition = useSimStore((s) => s.robotPosition);
  const robotYawRad = useSimStore((s) => s.robotYawRad);
  const setRobotPositionXZ = useSimStore((s) => s.setRobotPositionXZ);
  const setTransformInteracting = useSimStore((s) => s.setTransformInteracting);
  const transformInteracting = useSimStore((s) => s.transformInteracting);

  const [robotRt, setRobotRt] = useState<RobotRuntime | null>(null);
  const [robotScale, setRobotScale] = useState(1);
  const [robotYOffset, setRobotYOffset] = useState(0);
  const [robotBasePivotLocalXZ, setRobotBasePivotLocalXZ] = useState<[number, number]>([0, 0]);
  const didNormalizeRef = useRef(false);
  const robotMoveRef = useRef<Object3D | null>(null);
  const [robotMoveObj, setRobotMoveObj] = useState<Object3D | null>(null);
  const robotMoveControlsRef = useRef<TransformControlsImpl | null>(null);
  const setRobotMoveGroup = useCallback((obj: Object3D | null) => {
    robotMoveRef.current = obj;
    setRobotMoveObj((prev) => (prev === obj ? prev : obj));
  }, []);

  const obstacleObjectById = useMemo(() => new Map<string, Object3D>(), []);

  // Keep the robot move-group in sync with store state (important for reset).
  useEffect(() => {
    const o = robotMoveRef.current;
    if (!o) return;
    o.position.set(robotPosition[0], 0, robotPosition[2]);
    o.updateMatrixWorld(true);
  }, [robotPosition, robotYawRad]);

  // Safety: if TransformControls ever leaves us stuck, releasing pointer anywhere should recover.
  useEffect(() => {
    const onUp = () => setTransformInteracting(false);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [setTransformInteracting]);

  useEffect(() => {
    if (!robotMoveControlsRef.current || !robotMoveObj) return;
    const controls = robotMoveControlsRef.current;
    const controlsAny = controls as unknown as {
      addEventListener: (type: string, listener: (event?: unknown) => void) => void;
      removeEventListener: (type: string, listener: (event?: unknown) => void) => void;
    };

    const onDraggingChanged = (e: unknown) => {
      const v = (e as { value?: unknown } | null)?.value;
      const active = Boolean(v);
      setTransformInteracting(active);
    };
    const onMouseDown = () => {
      setTransformInteracting(true);
    };
    const onMouseUp = () => {
      setTransformInteracting(false);
    };
    const onObjectChange = () => {
      const o = robotMoveRef.current;
      if (!o) return;
      // Constrain to ground plane
      o.position.y = 0;
      setRobotPositionXZ(o.position.x, o.position.z);
    };

    controlsAny.addEventListener('dragging-changed', onDraggingChanged);
    controlsAny.addEventListener('mouseDown', onMouseDown);
    controlsAny.addEventListener('mouseUp', onMouseUp);
    controlsAny.addEventListener('objectChange', onObjectChange);
    return () => {
      controlsAny.removeEventListener('dragging-changed', onDraggingChanged);
      controlsAny.removeEventListener('mouseDown', onMouseDown);
      controlsAny.removeEventListener('mouseUp', onMouseUp);
      controlsAny.removeEventListener('objectChange', onObjectChange);
    };
  }, [robotMoveObj, setRobotPositionXZ, setTransformInteracting]);

  // Apply store joint angles to the `_Rotation` nodes.
  useFrame(() => {
    if (!robotRt) return;
    for (const j of joints) {
      const entry = robotRt.jointByName.get(j.name);
      if (!entry) continue;
      applyJointAngle(
        {
          name: j.name,
          axis: j.axis,
          object: entry.object,
          baseQuat: entry.baseQuat,
        },
        j.angleRad,
      );
    }
  });

  // Rebuild rotation node list for handles when overrides change (axis mapping doesn't affect handle placement).
  const rotationNodes = useMemo(() => {
    if (!robotRt) return [];
    return buildArm01Rig(robotRt.root, axisOverrides).rotationNodes;
  }, [robotRt, axisOverrides]);

  return (
    <>
      <Light />
      <AnimationPlayer />

      {/* Avoid z-fighting: keep plane slightly below grid */}
      <gridHelper args={[60, 120]} position={[0, 0.001, 0]} />
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
        raycast={NO_RAYCAST}
      >
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial
          color="#1a1f33"
          roughness={0.98}
          metalness={0}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>

      <OrbitControls ref={orbitRef} makeDefault enabled={!transformInteracting} />

      {/* Outer group: robot translation (XZ). Rotation is applied around a Base pivot below. */}
      <group
        ref={setRobotMoveGroup}
        position={[robotPosition[0], 0, robotPosition[2]]}
      >
        {/* Yaw pivot group: rotate around Base center so yaw doesn't "move" the robot. */}
        <group
          position={[robotBasePivotLocalXZ[0] * robotScale, 0, robotBasePivotLocalXZ[1] * robotScale]}
          rotation={[0, robotYawRad, 0]}
        >
          <group position={[-robotBasePivotLocalXZ[0] * robotScale, 0, -robotBasePivotLocalXZ[1] * robotScale]}>
            <group position={[0, robotYOffset, 0]} scale={[robotScale, robotScale, robotScale]}>
              <RobotLoader
                onReady={(rt) => {
                  setRobotRt(rt);
                  if (didNormalizeRef.current) return;
                  didNormalizeRef.current = true;

                  _box.setFromObject(rt.root);
                  _box.getSize(_size);
                  const maxDim = Math.max(_size.x, _size.y, _size.z);
                  if (Number.isFinite(maxDim) && maxDim > 0) {
                    const targetMax = 1.6;
                    const s = targetMax / maxDim;
                    setRobotScale(s);
                    setRobotYOffset(-_box.min.y * s);
                  }

                  // Find Base pivot (XZ) in root-local space for stable yaw rotation.
                  let baseObj: Object3D | null = null;
                  rt.root.traverse((o) => {
                    if (baseObj) return;
                    if (o.name === 'Base') baseObj = o;
                  });
                  if (baseObj) {
                    _pivotBox.setFromObject(baseObj);
                    _pivotBox.getCenter(_pivotCenter);
                    setRobotBasePivotLocalXZ([_pivotCenter.x, _pivotCenter.z]);
                  } else {
                    setRobotBasePivotLocalXZ([0, 0]);
                  }
                }}
              />
            </group>
          </group>
        </group>
      </group>

      {/* Robot base move gizmo: X/Z only (no Y) */}
      {selected?.kind === 'robot' && robotMoveObj ? (
        <TransformControls
          ref={robotMoveControlsRef}
          object={robotMoveObj}
          mode="translate"
          space="world"
          showX
          showY={false}
          showZ
          onPointerDown={(e) => {
            e.stopPropagation();
            setTransformInteracting(true);
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            setTransformInteracting(false);
          }}
          onPointerCancel={(e) => {
            e.stopPropagation();
            setTransformInteracting(false);
          }}
        />
      ) : null}

      {robotRt ? <JointHandles nodes={rotationNodes} /> : null}
      {robotRt && jointGizmoActive && selected?.kind === 'joint' ? (
        <JointGizmo
          jointNodeByName={
            new Map(Array.from(robotRt.jointByName.entries()).map(([k, v]) => [k, v.object]))
          }
        />
      ) : null}

      <ObstaclesLayer obstacleObjectById={obstacleObjectById} />
      <ObstacleGizmo obstacleObjectById={obstacleObjectById} />

      <CollisionSystem robotRoot={robotRt?.root ?? null} obstacleObjectById={obstacleObjectById} />
      <CollisionDebugBoxes robotRoot={robotRt?.root ?? null} obstacleObjectById={obstacleObjectById} />
    </>
  );
};
