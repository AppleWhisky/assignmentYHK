import type { StateCreator } from 'zustand';
import type { SimState } from '@/store/types';

export type SceneSlice = Pick<
  SimState,
  | 'camera'
  | 'gl'
  | 'setThree'
  | 'orbitControls'
  | 'setOrbitControls'
  | 'resetCamera'
  | 'resetScene'
  | 'showCollisionBoxes'
  | 'setShowCollisionBoxes'
  | 'showReachability'
  | 'setShowReachability'
>;

export const createSceneSlice: StateCreator<SimState, [], [], SceneSlice> = (set, get) => ({
  camera: null,
  gl: null,
  setThree: ({ camera, gl }) => set({ camera, gl }),

  orbitControls: null,
  setOrbitControls: (orbitControls) => set({ orbitControls }),

  resetCamera: () => {
    const oc = get().orbitControls;
    if (oc) oc.reset();
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

  showReachability: true,
  setShowReachability: (show) => set({ showReachability: show }),
});

