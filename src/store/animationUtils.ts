import type {
  AnimNode,
  AnimNodeData,
  AnimTarget,
  AnimStep,
  AnimationDefV1,
  AnimationDefV2,
  AnimationDefV3,
  AnimEdge,
} from '@/store/types';

type PublicAnimationsIndexV1 = { version: 1; files: string[] } | string[];

function targetKey(t: AnimTarget) {
  return t.kind === 'baseYaw' ? 'baseYaw' : `joint:${t.name}`;
}

export function computeAutoStartDegByNodeId(nodes: AnimNode[]) {
  // StartDeg is derived and not user-editable:
  // - first time a target appears => start = 0
  // - otherwise start = previous layer's end for that target
  // We compute in ascending layer order.
  const ordered = nodes
    .slice()
    .sort(
      (a, b) =>
        Math.floor(a.data.layer) - Math.floor(b.data.layer) || a.id.localeCompare(b.id),
    );

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

export function normalizeAnimationStartDeg(anim: AnimationDefV3): AnimationDefV3 {
  const startById = computeAutoStartDegByNodeId(anim.nodes);
  return {
    ...anim,
    nodes: anim.nodes.map((n) => ({
      ...n,
      data: { ...n.data, startDeg: startById.get(n.id) ?? 0 },
    })),
  };
}

function isAnimTarget(x: unknown): x is AnimTarget {
  if (!x || typeof x !== 'object') return false;
  const k = (x as { kind?: unknown }).kind;
  if (k === 'baseYaw') return true;
  if (k === 'joint') return typeof (x as { name?: unknown }).name === 'string';
  return false;
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

export function isAnimationDefV1(x: unknown): x is AnimationDefV1 {
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

function isAnimNodeV2(
  x: unknown,
): x is { id: string; position: { x: number; y: number }; data: Omit<AnimNodeData, 'layer'> } {
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

export function isAnimationDefV2(x: unknown): x is AnimationDefV2 {
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

export function isAnimationDefV3(x: unknown): x is AnimationDefV3 {
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

export function resolveTimelineLayers(
  anim: AnimationDefV3,
): { ok: true; layerKeys: number[] } | { ok: false; error: string } {
  if (!anim.nodes.length) return { ok: false, error: 'Add at least one animation box.' };
  let maxLayer = 0;

  // Validate layers and prevent conflicting writes in a single layer.
  const seenByLayer = new Map<number, Set<string>>();

  for (const n of anim.nodes) {
    const layer = Math.floor(n.data.layer);
    if (!Number.isFinite(layer) || layer <= 0) return { ok: false, error: 'Layer must be a positive integer.' };
    maxLayer = Math.max(maxLayer, layer);
    if (!seenByLayer.has(layer)) seenByLayer.set(layer, new Set());
    const k = targetKey(n.data.target);
    const set = seenByLayer.get(layer)!;
    if (set.has(k)) return { ok: false, error: `Duplicate target in layer ${layer}.` };
    set.add(k);
  }

  // Human-friendly timeline: layer N means time slot (N-1 ~ N).
  // Missing layers become empty “rest” slots automatically.
  const layerKeys = Array.from({ length: maxLayer }, (_, i) => i + 1);
  return { ok: true, layerKeys };
}

export async function loadAnimationsFromPublicFolder(): Promise<AnimationDefV3[]> {
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

export function coerceToAnimationDefV3(
  json: unknown,
): { ok: true; anim: AnimationDefV3 } | { ok: false; error: string } {
  try {
    if (isAnimationDefV3(json)) return { ok: true, anim: normalizeAnimationStartDeg(json) };
    if (isAnimationDefV1(json)) return { ok: true, anim: normalizeAnimationStartDeg(migrateV1ToV3(json)) };
    if (isAnimationDefV2(json)) return { ok: true, anim: normalizeAnimationStartDeg(migrateV2ToV3(json)) };
    return { ok: false, error: 'Unsupported animation JSON format (expected version 1/2/3).' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to parse animation JSON.';
    return { ok: false, error: msg };
  }
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
    outs.sort((a, b) => a.data.priority - b.data.priority);
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

