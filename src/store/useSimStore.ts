import { create } from 'zustand';
import type { SimState } from '@/store/types';
import { DEFAULT_JOINT_STEP_RAD } from '@/store/constants';
import { createSceneSlice } from '@/store/slices/sceneSlice';
import { createSelectionSlice } from '@/store/slices/selectionSlice';
import { createCollisionSlice } from '@/store/slices/collisionSlice';
import { createRobotSlice } from '@/store/slices/robotSlice';
import { createObstaclesSlice } from '@/store/slices/obstaclesSlice';
import { createAnimationSlice } from '@/store/slices/animationSlice';
import { createPlaybackSlice } from '@/store/slices/playbackSlice';

export const useSimStore = create<SimState>()((set, get, api) => ({
  ...createSceneSlice(set, get, api),
  ...createSelectionSlice(set, get, api),
  ...createCollisionSlice(set, get, api),
  ...createRobotSlice(set, get, api),
  ...createObstaclesSlice(set, get, api),
  ...createAnimationSlice(set, get, api),
  ...createPlaybackSlice(set, get, api),
}));

export { DEFAULT_JOINT_STEP_RAD };

export type {
  Axis,
  Selected,
  JointState,
  ObstacleState,
  CollisionSeverity,
  ObstacleCollisionPair,
  CollisionState,
  SelfCollisionPair,
  SelfCollisionState,
  AnimTarget,
  AnimLoopMode,
  AnimationDefV3,
  AnimStep,
  AnimationDefV1,
  AnimNodeData,
  AnimNode,
  AnimEdgeData,
  AnimEdge,
  AnimationDefV2,
  PlaybackState,
  PlaybackOptions,
  PlaybackReportEvent,
  SimState,
} from './types';
