import { create } from 'zustand';
import type { WebGLRenderer } from 'three';
import type { Camera } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

export type Axis = 'x' | 'y' | 'z';

export type Selected =
  | { kind: 'joint'; name: string }
  | { kind: 'obstacle'; id: string }
  | { kind: 'robot' }
  | null;

export type JointState = {
  name: string;
  label: string;
  axis: Axis;
  angleRad: number;
  homeAngleRad: number;
  minRad?: number;
  maxRad?: number;
  stepRad: number;
};

export type ObstacleState = {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number, number];
};

export type CollisionSeverity = 'none' | 'warning' | 'collision';

export type CollisionState = {
  severity: CollisionSeverity;
  warningMeshNames: string[];
  collidingMeshNames: string[];
  warningObstacleIds: string[];
  collidingObstacleIds: string[];
};

export type SimState = {
  // Scene slice
  camera: Camera | null;
  gl: WebGLRenderer | null;
  setThree: (v: { camera: Camera; gl: WebGLRenderer }) => void;
  orbitControls: OrbitControlsImpl | null;
  setOrbitControls: (c: OrbitControlsImpl | null) => void;
  resetCamera: () => void;
  resetScene: () => void;

  // Debug / dev flags
  showCollisionBoxes: boolean;
  setShowCollisionBoxes: (show: boolean) => void;

  // Robot slice
  joints: JointState[];
  jointAxisOverrides: Record<string, Axis>;
  setJoints: (joints: JointState[]) => void;
  setJointAngle: (name: string, angleRad: number) => void;
  nudgeJoint: (name: string, dir: 1 | -1) => void;
  setJointAxisOverride: (name: string, axis: Axis | null) => void;
  jointGizmoActive: boolean;
  setJointGizmoActive: (active: boolean) => void;
  transformInteracting: boolean;
  setTransformInteracting: (active: boolean) => void;

  // Robot pose (world)
  robotPosition: [number, number, number];
  robotYawRad: number;
  setRobotPositionXZ: (x: number, z: number) => void;
  setRobotYawRad: (yawRad: number) => void;
  nudgeRobotYaw: (dir: 1 | -1) => void;
  resetRobotPosition: () => void;
  resetRobotPose: () => void;

  // Objects slice
  obstacles: ObstacleState[];
  addObstacle: () => void;
  removeObstacle: (id: string) => void;
  updateObstaclePose: (
    id: string,
    pose: Partial<Pick<ObstacleState, 'position' | 'rotation'>>,
  ) => void;
  updateObstacleSize: (id: string, size: ObstacleState['size']) => void;
  obstacleRegistryVersion: number;
  bumpObstacleRegistryVersion: () => void;

  // Selection
  selected: Selected;
  setSelected: (selected: Selected) => void;

  // Collision
  collision: CollisionState;
  setCollision: (c: CollisionState) => void;
};

function clamp(n: number, min?: number, max?: number) {
  if (typeof min === 'number') n = Math.max(min, n);
  if (typeof max === 'number') n = Math.min(max, n);
  return n;
}

function rad(deg: number) {
  return (deg * Math.PI) / 180;
}

function makeId() {
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

function randBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function halfXZ(size: [number, number, number]) {
  return Math.max(size[0], size[2]) * 0.5;
}

function isSpawnSafeXZ(
  x: number,
  z: number,
  size: [number, number, number],
  robotPosition: [number, number, number],
  obstacles: ObstacleState[],
) {
  // Very simple safety: avoid robot footprint and existing obstacle footprints (circle approximation in XZ).
  const myR = halfXZ(size);
  const robotAvoidR = 0.95; // heuristic world-space radius around robot base
  const dxr = x - robotPosition[0];
  const dzr = z - robotPosition[2];
  if (dxr * dxr + dzr * dzr < (robotAvoidR + myR) * (robotAvoidR + myR)) return false;

  for (const o of obstacles) {
    const r = halfXZ(o.size);
    const dx = x - o.position[0];
    const dz = z - o.position[2];
    const minR = r + myR + 0.08; // small gap
    if (dx * dx + dz * dz < minR * minR) return false;
  }

  return true;
}

function chooseSpawnXZ(
  size: [number, number, number],
  robotPosition: [number, number, number],
  obstacles: ObstacleState[],
): [number, number] {
  // Sample a ring around the robot and pick the first safe point.
  const baseR = 1.2 + obstacles.length * 0.1;
  for (let i = 0; i < 32; i++) {
    const a = randBetween(0, Math.PI * 2);
    const r = baseR + randBetween(0, 0.6);
    const x = robotPosition[0] + Math.cos(a) * r;
    const z = robotPosition[2] + Math.sin(a) * r;
    if (isSpawnSafeXZ(x, z, size, robotPosition, obstacles)) return [x, z];
  }
  // Fallback: still offset from robot, even if it overlaps another obstacle.
  return [robotPosition[0] + baseR, robotPosition[2]];
}

export const useSimStore = create<SimState>((set, get) => ({
  camera: null,
  gl: null,
  setThree: ({ camera, gl }) => set({ camera, gl }),
  orbitControls: null,
  setOrbitControls: (orbitControls) => set({ orbitControls }),
  resetCamera: () => {
    const oc = get().orbitControls;
    if (oc) {
      oc.reset();
    }
  },
  resetScene: () => {
    // Full reset: robot pose + obstacles + selection + collision + debug flags (+ camera if available)
    get().resetRobotPose();
    set({
      obstacles: [],
      collision: {
        severity: 'none',
        warningMeshNames: [],
        collidingMeshNames: [],
        warningObstacleIds: [],
        collidingObstacleIds: [],
      },
      showCollisionBoxes: false,
      selected: null,
      jointGizmoActive: false,
      transformInteracting: false,
    });
    get().resetCamera();
  },

  showCollisionBoxes: false,
  setShowCollisionBoxes: (show) => set({ showCollisionBoxes: show }),

  joints: [],
  jointAxisOverrides: {},
  setJoints: (joints) => set({ joints }),
  setJointAngle: (name, angleRad) =>
    set((s) => ({
      joints: s.joints.map((j) =>
        j.name === name ? { ...j, angleRad: clamp(angleRad, j.minRad, j.maxRad) } : j,
      ),
    })),
  nudgeJoint: (name, dir) => {
    const j = get().joints.find((x) => x.name === name);
    if (!j) return;
    get().setJointAngle(name, j.angleRad + dir * j.stepRad);
  },
  setJointAxisOverride: (name, axis) =>
    set((s) => {
      const next = { ...s.jointAxisOverrides };
      if (axis) next[name] = axis;
      else delete next[name];
      return { jointAxisOverrides: next };
    }),
  jointGizmoActive: false,
  setJointGizmoActive: (active) => set({ jointGizmoActive: active }),
  transformInteracting: false,
  setTransformInteracting: (active) => set({ transformInteracting: active }),

  robotPosition: [0, 0, 0],
  robotYawRad: 0,
  setRobotPositionXZ: (x, z) =>
    set((s) => ({
      robotPosition: [x, s.robotPosition[1], z],
    })),
  setRobotYawRad: (yawRad) => set({ robotYawRad: yawRad }),
  nudgeRobotYaw: (dir) => set((s) => ({ robotYawRad: s.robotYawRad + dir * DEFAULT_JOINT_STEP_RAD })),
  resetRobotPosition: () => set({ robotPosition: [0, 0, 0] }),
  resetRobotPose: () =>
    set((s) => ({
      robotPosition: [0, 0, 0],
      robotYawRad: 0,
      joints: s.joints.map((j) => ({ ...j, angleRad: j.homeAngleRad })),
      selected: null,
      jointGizmoActive: false,
      transformInteracting: false,
    })),

  obstacles: [],
  obstacleRegistryVersion: 0,
  bumpObstacleRegistryVersion: () => set((s) => ({ obstacleRegistryVersion: s.obstacleRegistryVersion + 1 })),
  addObstacle: () =>
    set((s) => {
      const id = makeId();
      const idx = s.obstacles.length + 1;
      const size: [number, number, number] = [0.55, 0.55, 0.55];
      const [x, z] = chooseSpawnXZ(size, s.robotPosition, s.obstacles);
      const y = size[1] * 0.5; // sit on the floor
      const basePos: [number, number, number] = [x, y, z];
      return {
        obstacles: [
          ...s.obstacles,
          {
            id,
            name: `Obstacle ${idx}`,
            position: basePos,
            rotation: [0, 0, 0],
            size,
          },
        ],
        selected: { kind: 'obstacle', id },
      };
    }),
  removeObstacle: (id) =>
    set((s) => ({
      obstacles: s.obstacles.filter((o) => o.id !== id),
      selected: s.selected?.kind === 'obstacle' && s.selected.id === id ? null : s.selected,
    })),
  updateObstaclePose: (id, pose) =>
    set((s) => ({
      obstacles: s.obstacles.map((o) =>
        o.id === id
          ? {
              ...o,
              position: pose.position ?? o.position,
              rotation: pose.rotation ?? o.rotation,
            }
          : o,
      ),
    })),
  updateObstacleSize: (id, size) =>
    set((s) => ({
      obstacles: s.obstacles.map((o) => (o.id === id ? { ...o, size } : o)),
    })),

  selected: null,
  setSelected: (selected) =>
    set((s) => ({
      selected,
      // If we leave joint selection, hide the joint gizmo.
      jointGizmoActive: selected?.kind === 'joint' ? s.jointGizmoActive : false,
    })),

  collision: {
    severity: 'none',
    warningMeshNames: [],
    collidingMeshNames: [],
    warningObstacleIds: [],
    collidingObstacleIds: [],
  },
  setCollision: (collision) => set({ collision }),
}));

export const DEFAULT_JOINT_STEP_RAD = rad(0.5);
