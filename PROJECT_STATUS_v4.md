## Project Status v4 — Robot Arm Simulator (R3F)

This document reflects the **current code state** after multiple UX + simulation upgrades:
- Store refactor (slice-based)
- Reachability + joint limits
- Simulation-style collision reporting + optional auto-stop
- JSON import/export for animations

## Assignment requirements coverage (still satisfied)

- **Three.js 3D visualization**: Implemented (R3F + Drei).
  - Robot arm (3+ axes): joints extracted from `arm01.glb` `_Rotation` nodes.
  - Workspace: ground + grid.
- **Jog controller UI**: Implemented.
  - Joint sliders + hold-to-repeat +/-.
  - Robot base yaw control + robot XZ translation control.
- **Obstacle add/place**: Implemented.
  - Add/select/move box obstacles with gizmos.
- **Collision warning**: Implemented.
  - Robot-mesh AABB vs obstacle AABB warning/collision + tinting.

## How to run

```bash
npm install
npm run dev
```

Useful scripts:
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Major changes since v3

### 1) Store refactor (better maintainability)
- `useSimStore` remains the single entrypoint, but internals are split into slices:
  - `src/store/slices/*` (scene/robot/obstacles/selection/collision/animation/playback)
  - `src/store/types.ts`, `src/store/utils.ts`, `src/store/constants.ts`, `src/store/animationUtils.ts`

### 2) Resource lifecycle fixes
- Obstacle materials are no longer recreated on every state change (avoids GPU/material leaks):
  - `src/Three/Obstacles/ObstacleMesh.tsx`

### 3) Playback vs Jog: input locking
- While playback is running, **JogPanel robot controls are locked** (prevents “manual vs playback fighting”):
  - `src/UI/JogPanel.tsx`

### 4) Joint limits (hardcoded) + Reachability guide
- Joint limits are now supported via `JointState.minRad/maxRad` (hardcoded per joint name):
  - `src/Three/Robot/Arm01Rig.ts`
- Reachability is shown as a **ground ring** (auto-estimated) and can be toggled:
  - `src/Three/Reachability/ReachabilityRing.tsx`
  - `src/Three/RobotScene.tsx`
  - `src/store/slices/sceneSlice.ts`, `src/UI/TopBar.tsx`

### 5) Animation editor: Import JSON added
- Animator now supports **Import JSON** in addition to Export JSON.
  - Accepts v1/v2/v3 JSON and migrates into v3 automatically.
  - Imported animation loads into draft; you then click **Save** to add it to the in-memory library.
- Files:
  - `src/UI/AnimationEditor/AnimationEditorOverlay.tsx`
  - `src/store/animationUtils.ts` (`coerceToAnimationDefV3`)
  - `src/store/slices/animationSlice.ts`

## “Simulation-style” collision reporting (new)

### Stop-on-collision option
- `JogPanel` provides a **Stop on collision** option.
- If enabled, playback stops immediately when a collision occurs.

### Collision report logging
- Collisions are logged as events and shown in a report UI.
- Logging uses **collision start edges** (enter events) so loops can log again when collisions re-occur,
  without spamming every frame while contact is continuous.
- Report time is a **monotonic simulation elapsed time** (keeps increasing across loops).

### UI surfaces
- **Report modal**: can be opened after stop/end, and also anytime via BottomBar.
  - Made transparent and non-blocking so you can keep inspecting the 3D scene.
- **BottomBar**: repurposed to show **latest collision line** + `Full report` + `Clear`.
  - BottomBar only appears once at least one event exists.

Files:
- `src/Three/Animation/AnimationPlayer.tsx`
- `src/Three/Collision/CollisionSystem.tsx` (adds `collidingPairs` for accurate reporting)
- `src/UI/SimulationReport/SimulationReportModal.tsx`
- `src/UI/BottomBar.tsx`
- `src/App.tsx`

## Self-collision (current status)
- Self-collision detection was prototyped (`src/Three/Collision/SelfCollisionSystem.tsx`),
  but is **excluded from simulation stop/report by default** due to accuracy limitations with simple proxies.
- The code remains in the repository for future upgrades (e.g. better colliders / BVH / OBB).

## Key files (v4)

```
src/
  store/
    useSimStore.ts
    types.ts
    slices/
      collisionSlice.ts
      playbackSlice.ts
      animationSlice.ts
  Three/
    Animation/AnimationPlayer.tsx
    Collision/CollisionSystem.tsx
    Collision/SelfCollisionSystem.tsx
    Reachability/ReachabilityRing.tsx
    Robot/Arm01Rig.ts
    RobotScene.tsx
  UI/
    JogPanel.tsx
    BottomBar.tsx
    TopBar.tsx
    SimulationReport/SimulationReportModal.tsx
    AnimationEditor/AnimationEditorOverlay.tsx
public/
  animations/
    index.json
```

