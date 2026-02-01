import type { StateCreator } from 'zustand';
import type { SimState } from '@/store/types';

export type SelectionSlice = Pick<
  SimState,
  | 'selected'
  | 'setSelected'
  | 'jointGizmoActive'
  | 'setJointGizmoActive'
  | 'transformInteracting'
  | 'setTransformInteracting'
>;

export const createSelectionSlice: StateCreator<SimState, [], [], SelectionSlice> = (set) => ({
  selected: null,
  setSelected: (selected) =>
    set((s) => ({
      selected,
      // If we leave joint selection, hide the joint gizmo.
      jointGizmoActive: selected?.kind === 'joint' ? s.jointGizmoActive : false,
    })),

  jointGizmoActive: false,
  setJointGizmoActive: (active) => set({ jointGizmoActive: active }),

  transformInteracting: false,
  setTransformInteracting: (active) => set({ transformInteracting: active }),
});

