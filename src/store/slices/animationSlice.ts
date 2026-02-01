import type { StateCreator } from 'zustand';
import type { AnimLoopMode, AnimNode, AnimNodeData, AnimationDefV3, SimState } from '@/store/types';
import { makeId } from '@/store/utils';
import {
  coerceToAnimationDefV3,
  loadAnimationsFromPublicFolder,
  normalizeAnimationStartDeg,
  resolveTimelineLayers,
} from '@/store/animationUtils';

export type AnimationSlice = Pick<
  SimState,
  | 'animationEditorOpen'
  | 'setAnimationEditorOpen'
  | 'animationDraft'
  | 'newAnimationDraft'
  | 'setAnimationDraft'
  | 'setAnimationDraftName'
  | 'setAnimationDraftLoopMode'
  | 'addAnimationDraftNode'
  | 'removeAnimationDraftNode'
  | 'updateAnimationDraftNodeData'
  | 'updateAnimationDraftNodePosition'
  | 'autoArrangeAnimationDraftByLayer'
  | 'savedAnimations'
  | 'selectedAnimationId'
  | 'selectAnimation'
  | 'saveDraftToLibrary'
  | 'importAnimationJsonToDraft'
  | 'deleteSavedAnimation'
  | 'loadPresetAnimations'
  | 'presetAnimationsLoading'
  | 'presetAnimationsError'
>;

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

export const createAnimationSlice: StateCreator<SimState, [], [], AnimationSlice> = (set, get) => ({
  animationEditorOpen: false,
  setAnimationEditorOpen: (open) => {
    if (open) get().stopPlayback();
    set({ animationEditorOpen: open });
  },

  animationDraft: makeEmptyDraft(Date.now()),
  newAnimationDraft: () => set({ animationDraft: makeEmptyDraft(Date.now()) }),
  setAnimationDraft: (draft) => set({ animationDraft: draft }),

  setAnimationDraftName: (name) =>
    set((s) => ({ animationDraft: { ...s.animationDraft, name, updatedAt: Date.now() } })),

  setAnimationDraftLoopMode: (loopMode: AnimLoopMode) =>
    set((s) => ({ animationDraft: { ...s.animationDraft, loopMode, updatedAt: Date.now() } })),

  addAnimationDraftNode: (pos) =>
    set((s) => {
      const id = makeId();
      const position =
        pos ?? {
          x: 140 + s.animationDraft.nodes.length * 20,
          y: 120 + s.animationDraft.nodes.length * 20,
        };
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

  updateAnimationDraftNodeData: (nodeId, patch: Partial<AnimNodeData>) =>
    set((s) => ({
      animationDraft: {
        ...s.animationDraft,
        nodes: s.animationDraft.nodes.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n,
        ),
        updatedAt: Date.now(),
      },
    })),

  updateAnimationDraftNodePosition: (nodeId, pos) =>
    set((s) => ({
      animationDraft: {
        ...s.animationDraft,
        nodes: s.animationDraft.nodes.map((n) =>
          n.id === nodeId ? { ...n, position: { x: pos.x, y: pos.y } } : n,
        ),
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
        list.sort(
          (a, b) =>
            a.position.y - b.position.y ||
            a.position.x - b.position.x ||
            a.id.localeCompare(b.id),
        );
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

  importAnimationJsonToDraft: (json) => {
    const r = coerceToAnimationDefV3(json);
    if (!r.ok) return r;
    const now = Date.now();
    set({
      animationDraft: {
        ...r.anim,
        createdAt: typeof r.anim.createdAt === 'number' ? r.anim.createdAt : now,
        updatedAt: now,
      },
    });
    return { ok: true as const };
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
});

