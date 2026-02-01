import type { Camera, WebGLRenderer } from 'three';
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

export type ObstacleCollisionPair = {
  mesh: string;
  obstacleId: string;
};

export type CollisionState = {
  severity: CollisionSeverity;
  warningMeshNames: string[];
  collidingMeshNames: string[];
  warningObstacleIds: string[];
  collidingObstacleIds: string[];
  // Precise mapping for reporting (not just sets).
  warningPairs?: ObstacleCollisionPair[];
  collidingPairs?: ObstacleCollisionPair[];
};

export type SelfCollisionPair = {
  a: string;
  b: string;
  aIndex: number;
  bIndex: number;
};

export type SelfCollisionState = {
  pairs: SelfCollisionPair[];
};

export type AnimTarget = { kind: 'baseYaw' } | { kind: 'joint'; name: string };

export type AnimLoopMode = 'none' | 'pingpong';

// ----------------------------
// Animation V3 (layer timeline)
// ----------------------------
export type AnimationDefV3 = {
  version: 3;
  id: string;
  name: string;
  loopMode: AnimLoopMode;
  nodes: AnimNode[];
  createdAt: number;
  updatedAt: number;
};

// ----------------------------
// Animation V1 (legacy chain)
// ----------------------------
export type AnimStep = {
  id: string;
  target: AnimTarget;
  startDeg: number;
  endDeg: number;
  nextId: string | null;
};

export type AnimationDefV1 = {
  version: 1;
  id: string;
  name: string;
  loopMode: AnimLoopMode;
  startStepId: string | null;
  steps: AnimStep[];
  createdAt: number;
  updatedAt: number;
};

// ----------------------------
// Animation V2 (graph editor)
// ----------------------------
export type AnimNodeData = {
  target: AnimTarget;
  startDeg: number;
  endDeg: number;
  layer: number; // 1-based layer index (each layer == 1s slot)
  label?: string;
};

export type AnimNode = {
  id: string;
  position: { x: number; y: number };
  data: AnimNodeData;
};

export type AnimEdgeData = {
  priority: number;
};

export type AnimEdge = {
  id: string;
  source: string;
  target: string;
  data: AnimEdgeData;
};

export type AnimationDefV2 = {
  version: 2;
  id: string;
  name: string;
  loopMode: AnimLoopMode;
  startNodeId: string | null;
  nodes: AnimNode[];
  edges: AnimEdge[];
  createdAt: number;
  updatedAt: number;
};

export type PlaybackState = {
  status: 'idle' | 'playing';
  animationId: string | null;
  layerKeys: number[]; // sorted unique layers from animation
  playhead: number; // seconds from 0..duration
  direction: 1 | -1; // pingpong only
};

export type PlaybackOptions = {
  stopOnCollision: boolean;
  includeSelfCollision: boolean;
};

export type PlaybackReportEvent = {
  tSec: number;
  layer: number;
  kind: 'obstacle' | 'self';
  a: string;
  b: string;
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
  showReachability: boolean;
  setShowReachability: (show: boolean) => void;

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
  selfCollision: SelfCollisionState;
  setSelfCollision: (c: SelfCollisionState) => void;

  // Animation editor
  animationEditorOpen: boolean;
  setAnimationEditorOpen: (open: boolean) => void;
  animationDraft: AnimationDefV3;
  newAnimationDraft: () => void;
  setAnimationDraft: (draft: AnimationDefV3) => void;
  setAnimationDraftName: (name: string) => void;
  setAnimationDraftLoopMode: (loopMode: AnimLoopMode) => void;
  addAnimationDraftNode: (pos?: { x: number; y: number }) => void;
  removeAnimationDraftNode: (nodeId: string) => void;
  updateAnimationDraftNodeData: (nodeId: string, patch: Partial<AnimNodeData>) => void;
  updateAnimationDraftNodePosition: (nodeId: string, pos: { x: number; y: number }) => void;
  autoArrangeAnimationDraftByLayer: (opts?: {
    baseX?: number;
    baseY?: number;
    colWidth?: number;
    rowHeight?: number;
  }) => void;

  // Saved animation library (persisted)
  savedAnimations: AnimationDefV3[];
  selectedAnimationId: string | null;
  selectAnimation: (id: string | null) => void;
  saveDraftToLibrary: () => { ok: true; id: string } | { ok: false; error: string };
  importAnimationJsonToDraft: (json: unknown) => { ok: true } | { ok: false; error: string };
  deleteSavedAnimation: (id: string) => void;
  loadPresetAnimations: () => Promise<void>;
  presetAnimationsLoading: boolean;
  presetAnimationsError: string | null;

  // Playback
  playback: PlaybackState;
  playbackOptions: PlaybackOptions;
  setPlaybackOptions: (patch: Partial<PlaybackOptions>) => void;
  playbackReport: PlaybackReportEvent[];
  clearPlaybackReport: () => void;
  addPlaybackReportEvents: (events: PlaybackReportEvent[]) => void;
  reportModalOpen: boolean;
  setReportModalOpen: (open: boolean) => void;
  startPlayback: (animationId: string) => { ok: true } | { ok: false; error: string };
  stopPlayback: (reason?: 'user' | 'ended' | 'collision' | 'system') => void;
  setPlayback: (patch: Partial<PlaybackState>) => void;
};

