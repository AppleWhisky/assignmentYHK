import type { StateCreator } from 'zustand';
import type { Axis, JointState, SimState } from '@/store/types';
import { DEFAULT_JOINT_STEP_RAD } from '@/store/constants';
import { clamp } from '@/store/utils';

export type RobotSlice = Pick<
  SimState,
  | 'joints'
  | 'jointAxisOverrides'
  | 'setJoints'
  | 'setJointAngle'
  | 'nudgeJoint'
  | 'setJointAxisOverride'
  | 'robotPosition'
  | 'robotYawRad'
  | 'setRobotPositionXZ'
  | 'setRobotYawRad'
  | 'nudgeRobotYaw'
  | 'resetRobotPosition'
  | 'resetRobotPose'
>;

export const createRobotSlice: StateCreator<SimState, [], [], RobotSlice> = (set, get) => ({
  joints: [],
  jointAxisOverrides: {},

  setJoints: (joints: JointState[]) => set({ joints }),

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

  setJointAxisOverride: (name, axis: Axis | null) =>
    set((s) => {
      const next = { ...s.jointAxisOverrides };
      if (axis) next[name] = axis;
      else delete next[name];
      return { jointAxisOverrides: next };
    }),

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
});

