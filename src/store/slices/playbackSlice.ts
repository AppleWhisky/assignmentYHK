import type { StateCreator } from 'zustand';
import type { SimState } from '@/store/types';
import { resolveTimelineLayers } from '@/store/animationUtils';

export type PlaybackSlice = Pick<
  SimState,
  | 'playback'
  | 'playbackOptions'
  | 'setPlaybackOptions'
  | 'playbackReport'
  | 'clearPlaybackReport'
  | 'addPlaybackReportEvents'
  | 'reportModalOpen'
  | 'setReportModalOpen'
  | 'startPlayback'
  | 'stopPlayback'
  | 'setPlayback'
>;

export const createPlaybackSlice: StateCreator<SimState, [], [], PlaybackSlice> = (set, get) => ({
  playback: {
    status: 'idle',
    animationId: null,
    layerKeys: [],
    playhead: 0,
    direction: 1,
  },

  playbackOptions: {
    stopOnCollision: true,
    includeSelfCollision: false,
  },
  setPlaybackOptions: (patch) =>
    set((s) => ({ playbackOptions: { ...s.playbackOptions, ...patch } })),

  playbackReport: [],
  clearPlaybackReport: () => set({ playbackReport: [] }),
  addPlaybackReportEvents: (events) =>
    set((s) => ({ playbackReport: [...s.playbackReport, ...events] })),

  reportModalOpen: false,
  setReportModalOpen: (open) => set({ reportModalOpen: open }),

  startPlayback: (animationId) => {
    const anim = get().savedAnimations.find((a) => a.id === animationId) ?? null;
    if (!anim) return { ok: false as const, error: 'Animation not found.' };
    const resolved = resolveTimelineLayers(anim);
    if (!resolved.ok) return resolved;

    // New run: clear previous report + close modal
    get().clearPlaybackReport();
    get().setReportModalOpen(false);

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

  stopPlayback: (_reason) =>
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
});

