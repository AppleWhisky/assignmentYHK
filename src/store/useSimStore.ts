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

  // Animation editor
  animationEditorOpen: boolean;
  setAnimationEditorOpen: (open: boolean) => void;
  animationDraft: AnimationDefV3;
  newAnimationDraft: () => void;
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
  deleteSavedAnimation: (id: string) => void;
  loadPresetAnimations: () => Promise<void>;
  presetAnimationsLoading: boolean;
  presetAnimationsError: string | null;

  // Playback
  playback: PlaybackState;
  startPlayback: (animationId: string) => { ok: true } | { ok: false; error: string };
  stopPlayback: () => void;
  setPlayback: (patch: Partial<PlaybackState>) => void;
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

type PublicAnimationsIndexV1 = { version: 1; files: string[] } | string[];

async function loadAnimationsFromPublicFolder(): Promise<AnimationDefV3[]> {
  // NOTE: Vite does not allow listing directory contents at runtime.
  // We use a manifest file: /animations/index.json
  const res = await fetch('/animations/index.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load animations index (${res.status})`);
  const idx = (await res.json()) as PublicAnimationsIndexV1;

  const files = Array.isArray(idx) ? idx : idx.files;
  if (!Array.isArray(files)) throw new Error('Invalid animations index format.');

  const out: AnimationDefV3[] = [];
  for (const f of files) {
    if (typeof f !== 'string' || !f.trim()) continue;
    const url = f.startsWith('/') ? f : `/animations/${f}`;
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) continue;
    const json = (await r.json()) as unknown;

    if (isAnimationDefV3(json)) out.push(normalizeAnimationStartDeg(json));
    else if (isAnimationDefV1(json)) out.push(normalizeAnimationStartDeg(migrateV1ToV3(json)));
    else if (isAnimationDefV2(json)) out.push(normalizeAnimationStartDeg(migrateV2ToV3(json)));
  }

  // Stable sort for UI
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

function isAnimTarget(x: unknown): x is AnimTarget {
  if (!x || typeof x !== 'object') return false;
  const k = (x as { kind?: unknown }).kind;
  if (k === 'baseYaw') return true;
  if (k === 'joint') return typeof (x as { name?: unknown }).name === 'string';
  return false;
}

function targetKey(t: AnimTarget) {
  return t.kind === 'baseYaw' ? 'baseYaw' : `joint:${t.name}`;
}

function computeAutoStartDegByNodeId(nodes: AnimNode[]) {
  // StartDeg is derived and not user-editable:
  // - first time a target appears => start = 0
  // - otherwise start = previous layer's end for that target
  // We compute in ascending layer order.
  const ordered = nodes
    .slice()
    .sort((a, b) => (Math.floor(a.data.layer) - Math.floor(b.data.layer)) || a.id.localeCompare(b.id));

  const lastEndByTarget = new Map<string, number>();
  const startByNodeId = new Map<string, number>();

  for (const n of ordered) {
    const key = targetKey(n.data.target);
    const start = lastEndByTarget.get(key) ?? 0;
    startByNodeId.set(n.id, start);
    lastEndByTarget.set(key, n.data.endDeg);
  }

  return startByNodeId;
}

function normalizeAnimationStartDeg(anim: AnimationDefV3): AnimationDefV3 {
  const startById = computeAutoStartDegByNodeId(anim.nodes);
  return {
    ...anim,
    nodes: anim.nodes.map((n) => ({
      ...n,
      data: { ...n.data, startDeg: startById.get(n.id) ?? 0 },
    })),
  };
}

function isAnimStep(x: unknown): x is AnimStep {
  if (!x || typeof x !== 'object') return false;
  const o = x as Partial<AnimStep>;
  if (typeof o.id !== 'string') return false;
  if (!isAnimTarget(o.target)) return false;
  if (typeof o.startDeg !== 'number') return false;
  if (typeof o.endDeg !== 'number') return false;
  if (!(typeof o.nextId === 'string' || o.nextId === null)) return false;
  return true;
}

function isAnimationDefV1(x: unknown): x is AnimationDefV1 {
  if (!x || typeof x !== 'object') return false;
  const o = x as Partial<AnimationDefV1>;
  if (o.version !== 1) return false;
  if (typeof o.id !== 'string') return false;
  if (typeof o.name !== 'string') return false;
  if (!(o.loopMode === 'none' || o.loopMode === 'pingpong')) return false;
  if (!(typeof o.startStepId === 'string' || o.startStepId === null)) return false;
  if (!Array.isArray(o.steps) || !o.steps.every(isAnimStep)) return false;
  if (typeof o.createdAt !== 'number') return false;
  if (typeof o.updatedAt !== 'number') return false;
  return true;
}

function isAnimNodeDataV2(x: unknown): x is Omit<AnimNodeData, 'layer'> {
  if (!x || typeof x !== 'object') return false;
  const o = x as Partial<Omit<AnimNodeData, 'layer'>>;
  if (!isAnimTarget(o.target)) return false;
  if (typeof o.startDeg !== 'number') return false;
  if (typeof o.endDeg !== 'number') return false;
  if (!(typeof o.label === 'string' || typeof o.label === 'undefined')) return false;
  return true;
}

function isAnimNodeDataV3(x: unknown): x is AnimNodeData {
  if (!x || typeof x !== 'object') return false;
  const o = x as Partial<AnimNodeData>;
  if (!isAnimTarget(o.target)) return false;
  if (typeof o.startDeg !== 'number') return false;
  if (typeof o.endDeg !== 'number') return false;
  if (typeof o.layer !== 'number') return false;
  if (!(typeof o.label === 'string' || typeof o.label === 'undefined')) return false;
  return true;
}

function isAnimNodeV2(x: unknown): x is { id: string; position: { x: number; y: number }; data: Omit<AnimNodeData, 'layer'> } {
  if (!x || typeof x !== 'object') return false;
  const o = x as { id?: unknown; position?: unknown; data?: unknown };
  if (typeof o.id !== 'string') return false;
  const p = o.position as { x?: unknown; y?: unknown } | undefined;
  if (!p || typeof p !== 'object') return false;
  if (typeof p.x !== 'number') return false;
  if (typeof p.y !== 'number') return false;
  if (!isAnimNodeDataV2(o.data)) return false;
  return true;
}

function isAnimNode(x: unknown): x is AnimNode {
  if (!x || typeof x !== 'object') return false;
  const o = x as Partial<AnimNode>;
  if (typeof o.id !== 'string') return false;
  const p = o.position as unknown;
  if (!p || typeof p !== 'object') return false;
  if (typeof (p as { x?: unknown }).x !== 'number') return false;
  if (typeof (p as { y?: unknown }).y !== 'number') return false;
  if (!isAnimNodeDataV3(o.data)) return false;
  return true;
}

function isAnimEdge(x: unknown): x is AnimEdge {
  if (!x || typeof x !== 'object') return false;
  const o = x as Partial<AnimEdge>;
  if (typeof o.id !== 'string') return false;
  if (typeof o.source !== 'string') return false;
  if (typeof o.target !== 'string') return false;
  const d = o.data as unknown;
  if (!d || typeof d !== 'object') return false;
  if (typeof (d as { priority?: unknown }).priority !== 'number') return false;
  return true;
}

function isAnimationDefV2(x: unknown): x is AnimationDefV2 {
  if (!x || typeof x !== 'object') return false;
  const o = x as Partial<AnimationDefV2>;
  if (o.version !== 2) return false;
  if (typeof o.id !== 'string') return false;
  if (typeof o.name !== 'string') return false;
  if (!(o.loopMode === 'none' || o.loopMode === 'pingpong')) return false;
  if (!(typeof o.startNodeId === 'string' || o.startNodeId === null)) return false;
  if (!Array.isArray(o.nodes) || !o.nodes.every(isAnimNodeV2)) return false;
  if (!Array.isArray(o.edges) || !o.edges.every(isAnimEdge)) return false;
  if (typeof o.createdAt !== 'number') return false;
  if (typeof o.updatedAt !== 'number') return false;
  return true;
}

function isAnimationDefV3(x: unknown): x is AnimationDefV3 {
  if (!x || typeof x !== 'object') return false;
  const o = x as Partial<AnimationDefV3>;
  if (o.version !== 3) return false;
  if (typeof o.id !== 'string') return false;
  if (typeof o.name !== 'string') return false;
  if (!(o.loopMode === 'none' || o.loopMode === 'pingpong')) return false;
  if (!Array.isArray(o.nodes) || !o.nodes.every(isAnimNode)) return false;
  if (typeof o.createdAt !== 'number') return false;
  if (typeof o.updatedAt !== 'number') return false;
  return true;
}

function makeEmptyDraft(now: number): AnimationDefV3 {
  return {
    version: 3,
    id: makeId(),
    name: 'New animation',
    loopMode: 'none',
    nodes: [],
    createdAt: now,
    updatedAt: now,
  };
}

function migrateV1ToV3(v1: AnimationDefV1): AnimationDefV3 {
  const now = Date.now();
  const baseX = 140;
  const baseY = 120;
  const stepGapY = 140;

  const nodes: AnimNode[] = v1.steps.map((s, idx) => ({
    id: s.id,
    position: { x: baseX, y: baseY + idx * stepGapY },
    data: {
      target: s.target,
      startDeg: s.startDeg,
      endDeg: s.endDeg,
      layer: idx + 1,
      label: `Step ${idx + 1}`,
    },
  }));

  return {
    version: 3,
    id: v1.id,
    name: v1.name,
    loopMode: v1.loopMode,
    nodes,
    createdAt: typeof v1.createdAt === 'number' ? v1.createdAt : now,
    updatedAt: now,
  };
}

function resolvePriorityPathV2(anim: AnimationDefV2): string[] {
  // Best-effort: follow lowest priority edge to build an ordering.
  if (!anim.startNodeId) return [];
  const nodeIds = new Set(anim.nodes.map((n) => n.id));
  if (!nodeIds.has(anim.startNodeId)) return [];
  const outgoing = new Map<string, AnimEdge[]>();
  for (const id of nodeIds) outgoing.set(id, []);
  for (const e of anim.edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    outgoing.get(e.source)!.push(e);
  }
  const ordered: string[] = [];
  const visited = new Set<string>();
  let cur: string | null = anim.startNodeId;
  while (cur) {
    if (visited.has(cur)) break;
    visited.add(cur);
    ordered.push(cur);
    const outs: AnimEdge[] = outgoing.get(cur) ?? [];
    if (!outs.length) break;
    outs.sort((a: AnimEdge, b: AnimEdge) => a.data.priority - b.data.priority);
    cur = outs[0]!.target;
  }
  return ordered;
}

function migrateV2ToV3(v2: AnimationDefV2): AnimationDefV3 {
  const now = Date.now();
  const order = resolvePriorityPathV2(v2);
  const layerById = new Map<string, number>();
  order.forEach((id, idx) => layerById.set(id, idx + 1));

  const nodes: AnimNode[] = v2.nodes.map((n, idx) => ({
    id: n.id,
    position: n.position,
    data: {
      target: n.data.target,
      startDeg: n.data.startDeg,
      endDeg: n.data.endDeg,
      layer: layerById.get(n.id) ?? 1,
      label: n.data.label ?? `Step ${idx + 1}`,
    },
  }));

  return {
    version: 3,
    id: v2.id,
    name: v2.name,
    loopMode: v2.loopMode,
    nodes,
    createdAt: typeof v2.createdAt === 'number' ? v2.createdAt : now,
    updatedAt: now,
  };
}

function resolveTimelineLayers(anim: AnimationDefV3): { ok: true; layerKeys: number[] } | { ok: false; error: string } {
  if (!anim.nodes.length) return { ok: false, error: 'Add at least one animation box.' };
  let maxLayer = 0;

  // Validate layers and prevent conflicting writes in a single layer.
  const keyForTarget = (t: AnimTarget) => (t.kind === 'baseYaw' ? 'baseYaw' : `joint:${t.name}`);
  const seenByLayer = new Map<number, Set<string>>();

  for (const n of anim.nodes) {
    const layer = Math.floor(n.data.layer);
    if (!Number.isFinite(layer) || layer <= 0) return { ok: false, error: 'Layer must be a positive integer.' };
    maxLayer = Math.max(maxLayer, layer);
    if (!seenByLayer.has(layer)) seenByLayer.set(layer, new Set());
    const k = keyForTarget(n.data.target);
    const set = seenByLayer.get(layer)!;
    if (set.has(k)) return { ok: false, error: `Duplicate target in layer ${layer}.` };
    set.add(k);
  }

  // Human-friendly timeline: layer N means time slot (N-1 ~ N).
  // Missing layers become empty “rest” slots automatically.
  const layerKeys = Array.from({ length: maxLayer }, (_, i) => i + 1);
  return { ok: true, layerKeys };
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

  animationEditorOpen: false,
  setAnimationEditorOpen: (open) => {
    if (open) get().stopPlayback();
    set({ animationEditorOpen: open });
  },
  animationDraft: makeEmptyDraft(Date.now()),
  newAnimationDraft: () => set({ animationDraft: makeEmptyDraft(Date.now()) }),
  setAnimationDraftName: (name) => set((s) => ({ animationDraft: { ...s.animationDraft, name, updatedAt: Date.now() } })),
  setAnimationDraftLoopMode: (loopMode) =>
    set((s) => ({ animationDraft: { ...s.animationDraft, loopMode, updatedAt: Date.now() } })),
  addAnimationDraftNode: (pos) =>
    set((s) => {
      const id = makeId();
      const position = pos ?? { x: 140 + s.animationDraft.nodes.length * 20, y: 120 + s.animationDraft.nodes.length * 20 };
      const node: AnimNode = {
        id,
        position,
        data: {
          target: { kind: 'baseYaw' },
          startDeg: 0,
          endDeg: 0,
          layer: 1,
          label: `Box ${s.animationDraft.nodes.length + 1}`,
        },
      };
      const nodes = [...s.animationDraft.nodes, node];
      return { animationDraft: { ...s.animationDraft, nodes, updatedAt: Date.now() } };
    }),
  removeAnimationDraftNode: (nodeId) =>
    set((s) => {
      const nodes = s.animationDraft.nodes.filter((n) => n.id !== nodeId);
      return { animationDraft: { ...s.animationDraft, nodes, updatedAt: Date.now() } };
    }),
  updateAnimationDraftNodeData: (nodeId, patch) =>
    set((s) => ({
      animationDraft: {
        ...s.animationDraft,
        nodes: s.animationDraft.nodes.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)),
        updatedAt: Date.now(),
      },
    })),
  updateAnimationDraftNodePosition: (nodeId, pos) =>
    set((s) => ({
      animationDraft: {
        ...s.animationDraft,
        nodes: s.animationDraft.nodes.map((n) => (n.id === nodeId ? { ...n, position: { x: pos.x, y: pos.y } } : n)),
        updatedAt: Date.now(),
      },
    })),
  autoArrangeAnimationDraftByLayer: (opts) =>
    set((s) => {
      const baseX = opts?.baseX ?? 80;
      const baseY = opts?.baseY ?? 80;
      // Give generous spacing so typical node cards never overlap.
      const colWidth = opts?.colWidth ?? 420;
      const rowHeight = opts?.rowHeight ?? 240;

      // Group nodes by layer (absolute). Keep ordering stable by current y then x.
      const byLayer = new Map<number, AnimNode[]>();
      let maxLayer = 0;
      for (const n of s.animationDraft.nodes) {
        const layer = Math.max(1, Math.floor(n.data.layer));
        maxLayer = Math.max(maxLayer, layer);
        if (!byLayer.has(layer)) byLayer.set(layer, []);
        byLayer.get(layer)!.push(n);
      }
      for (const list of byLayer.values()) {
        list.sort((a, b) => (a.position.y - b.position.y) || (a.position.x - b.position.x) || a.id.localeCompare(b.id));
      }

      const nextById = new Map<string, { x: number; y: number }>();
      for (let layer = 1; layer <= maxLayer; layer++) {
        const list = byLayer.get(layer) ?? [];
        for (let row = 0; row < list.length; row++) {
          const id = list[row]!.id;
          nextById.set(id, {
            x: baseX + (layer - 1) * colWidth,
            y: baseY + row * rowHeight,
          });
        }
      }

      return {
        animationDraft: {
          ...s.animationDraft,
          nodes: s.animationDraft.nodes.map((n) => {
            const p = nextById.get(n.id);
            return p ? { ...n, position: p } : n;
          }),
          updatedAt: Date.now(),
        },
      };
    }),

  savedAnimations: [],
  selectedAnimationId: null,
  selectAnimation: (id) => {
    set({ selectedAnimationId: id });
  },
  saveDraftToLibrary: () => {
    const draft = get().animationDraft;
    const resolved = resolveTimelineLayers(draft);
    if (!resolved.ok) return resolved;

    const now = Date.now();
    const existing = get().savedAnimations.find((a) => a.id === draft.id) ?? null;
    const toSave: AnimationDefV3 = {
      ...normalizeAnimationStartDeg(draft),
      createdAt: existing?.createdAt ?? draft.createdAt ?? now,
      updatedAt: now,
    };

    const next = [...get().savedAnimations.filter((a) => a.id !== toSave.id), toSave].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    set({ savedAnimations: next, selectedAnimationId: toSave.id });
    return { ok: true as const, id: toSave.id };
  },
  deleteSavedAnimation: (id) => {
    const next = get().savedAnimations.filter((a) => a.id !== id);
    const selected = get().selectedAnimationId === id ? null : get().selectedAnimationId;
    set({ savedAnimations: next, selectedAnimationId: selected });
  },
  presetAnimationsLoading: false,
  presetAnimationsError: null,
  loadPresetAnimations: async () => {
    if (get().presetAnimationsLoading) return;
    set({ presetAnimationsLoading: true, presetAnimationsError: null });
    try {
      const animations = await loadAnimationsFromPublicFolder();
      const selectedId = get().selectedAnimationId;
      const stillExists = selectedId ? animations.some((a) => a.id === selectedId) : true;
      set({
        savedAnimations: animations,
        selectedAnimationId: stillExists ? selectedId : null,
        presetAnimationsLoading: false,
        presetAnimationsError: null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load preset animations.';
      set({ presetAnimationsLoading: false, presetAnimationsError: msg });
    }
  },

  playback: {
    status: 'idle',
    animationId: null,
    layerKeys: [],
    playhead: 0,
    direction: 1,
  },
  startPlayback: (animationId) => {
    const anim = get().savedAnimations.find((a) => a.id === animationId) ?? null;
    if (!anim) return { ok: false as const, error: 'Animation not found.' };
    const resolved = resolveTimelineLayers(anim);
    if (!resolved.ok) return resolved;

    // UX: keep simulator tidy while playing
    get().setTransformInteracting(false);
    get().setJointGizmoActive(false);
    get().setSelected({ kind: 'robot' });

    // Start baseline: if a target has no previous layer, it starts from 0.
    // To prevent visible jumps, reset all controllable targets to 0 at playback start.
    get().setRobotYawRad(0);
    for (const j of get().joints) {
      get().setJointAngle(j.name, 0);
    }

    set({
      playback: {
        status: 'playing',
        animationId,
        layerKeys: resolved.layerKeys,
        playhead: 0,
        direction: 1,
      },
    });
    return { ok: true as const };
  },
  stopPlayback: () =>
    set({
      playback: {
        status: 'idle',
        animationId: null,
        layerKeys: [],
        playhead: 0,
        direction: 1,
      },
    }),
  setPlayback: (patch) => set((s) => ({ playback: { ...s.playback, ...patch } })),
}));

export const DEFAULT_JOINT_STEP_RAD = rad(0.5);
