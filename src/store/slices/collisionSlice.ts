import type { StateCreator } from 'zustand';
import type { SimState } from '@/store/types';

export type CollisionSlice = Pick<
  SimState,
  'collision' | 'setCollision' | 'selfCollision' | 'setSelfCollision'
>;

export const createCollisionSlice: StateCreator<SimState, [], [], CollisionSlice> = (set) => ({
  collision: {
    severity: 'none',
    warningMeshNames: [],
    collidingMeshNames: [],
    warningObstacleIds: [],
    collidingObstacleIds: [],
    warningPairs: [],
    collidingPairs: [],
  },
  setCollision: (collision) => set({ collision }),

  selfCollision: {
    pairs: [],
  },
  setSelfCollision: (selfCollision) => set({ selfCollision }),
});

