import { create } from 'zustand';
import type { WebGLRenderer } from 'three';
import type { Camera } from 'three';

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
  collidingMeshNames: string[];
  collidingObstacleIds: string[];
};

export type SimState = {
  // Scene slice
  camera: Camera | null;
  gl: WebGLRenderer | null;
  setThree: (v: { camera: Camera; gl: WebGLRenderer }) => void;

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
  setRobotPositionXZ: (x: number, z: number) => void;
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

export const useSimStore = create<SimState>((set, get) => ({
  camera: null,
  gl: null,
  setThree: ({ camera, gl }) => set({ camera, gl }),

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
  setRobotPositionXZ: (x, z) =>
    set((s) => ({
      robotPosition: [x, s.robotPosition[1], z],
    })),
  resetRobotPosition: () => set({ robotPosition: [0, 0, 0] }),
  resetRobotPose: () =>
    set((s) => ({
      robotPosition: [0, 0, 0],
      joints: s.joints.map((j) => ({ ...j, angleRad: j.homeAngleRad })),
      selected: null,
    })),

  obstacles: [],
  addObstacle: () =>
    set((s) => {
      const id = makeId();
      const idx = s.obstacles.length + 1;
      const basePos: [number, number, number] = [0.6, 0.2, 0.2];
      const size: [number, number, number] = [0.2, 0.2, 0.2];
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

  collision: { severity: 'none', collidingMeshNames: [], collidingObstacleIds: [] },
  setCollision: (collision) => set({ collision }),
}));

export const DEFAULT_JOINT_STEP_RAD = rad(0.5);
