## Project Status v5 — Robot Arm Simulator (R3F)

This document reflects the **current code state** after recent work on:
- Collision stability (OBB-based robot↔obstacle checks + better debug visualization)
- UI input usability (numeric inputs no longer “stick” to leading `0`)
- Playback UX safety (avoid TransformControls interactions during playback)
- Default HDRI environment lighting

## Assignment requirements coverage (still satisfied)

- **Three.js 3D visualization**: Implemented (React Three Fiber + Drei).
  - Robot arm (3+ axes): joints extracted from `arm01.glb` `_Rotation` nodes.
  - Workspace: ground + grid.
- **Jog controller UI**: Implemented.
  - Joint sliders + hold-to-repeat +/-.
  - Robot base yaw control + robot XZ translation control (TransformControls).
- **Obstacle add/place**: Implemented.
  - Add/select/move box obstacles with gizmos.
- **Collision warning**: Implemented.
  - Robot↔obstacle “warning/collision” + tinting + debug boxes toggle.

## How to run

```bash
npm install
npm run dev
```

Useful scripts:
- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Major changes since v4

### 1) Default environment HDRI
- Default environment lighting uses:
  - `src/assets/hdri/studio_kontrast_03_1k.hdr`
- File:
  - `src/Three/Light.tsx`

### 2) Robot↔obstacle collision: OBB-based (better under rotation/scale)
- Collision now uses **OBB vs OBB** (oriented bounding boxes) for robot meshes vs obstacles.
  - This reduces false positives caused by AABB growth when objects rotate.
- Warning uses an expanded OBB margin (near-collision zone):
  - `WARNING_MARGIN = 0.03`
- File:
  - `src/Three/Collision/CollisionSystem.tsx`

### 3) Debug “Boxes” now show oriented boxes (OBB wireframe)
- The TopBar `Boxes` toggle draws **oriented wire boxes** for both robot meshes and obstacles.
- File:
  - `src/Three/Collision/CollisionDebugBoxes.tsx`

### 4) Numeric input UX improvements (Obstacle + Animator)

#### Obstacle property inputs
- Vector inputs (Pos/Rot/Scale) are now edited via **string buffers**:
  - Allows clearing, typing `-`, typing `100` directly, etc.
  - Commit happens on **blur / Enter**.
  - Invalid/empty values revert to the previous value.
  - Focus auto-selects the whole value for quick replacement.
- Scale safety:
  - Negative scale values are clamped to `0` (UI + store-level safety).
- Files:
  - `src/UI/ObstaclePanel.tsx`
  - `src/store/slices/obstaclesSlice.ts`

#### Animation editor inputs
- `End (deg)` is now a text-buffer input so negative values are easy to type (e.g. `-45`), and styling matches the dark UI theme.
- `Layer` input retains the digit-only behavior and is styled to match.
- File:
  - `src/UI/AnimationEditor/AnimationEditorOverlay.tsx`

### 5) Playback safety: avoid TransformControls side-effects during playback
- Playback start no longer forces selecting the robot, to avoid mounting `TransformControls` during playback.
- Robot move `TransformControls` is not rendered while playback is running, and its `objectChange` handler is guarded so playback cannot mutate `robotPosition`.
- Files:
  - `src/store/slices/playbackSlice.ts`
  - `src/Three/RobotScene.tsx`

## Known issues / notes

- **Playback + BaseYaw**: When an animation includes `BaseYaw`, users have observed the robot base XZ position snapping to `(0,0,0)` at playback start in some cases.
  - Mitigations were added to avoid TransformControls events during playback, but if it still reproduces it likely indicates an additional path mutating `robotPosition` outside the TransformControls handler and needs further tracing.
- **Simulation start pose**: Playback currently resets joint targets to a baseline (0) for “first appearance starts at 0” consistency. Robot base position is intended to be preserved.

## Key files (v5)

```
src/
  Three/
    Light.tsx
    RobotScene.tsx
    Collision/
      CollisionSystem.tsx
      CollisionDebugBoxes.tsx
    Animation/
      AnimationPlayer.tsx
  UI/
    TopBar.tsx
    JogPanel.tsx
    ObstaclePanel.tsx
    AnimationEditor/AnimationEditorOverlay.tsx
  store/
    types.ts
    slices/
      playbackSlice.ts
      obstaclesSlice.ts
```

