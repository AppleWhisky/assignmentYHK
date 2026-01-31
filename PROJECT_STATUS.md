# Project Status — Robot Arm Simulator (R3F)

## Notice (v2 doc available)

This file is kept for historical notes, but the up-to-date project status is now in:

- `PROJECT_STATUS_v3.md`

---

This document summarizes the **current state** of the project: what’s implemented, where it lives, how to use it, and what the most valuable next steps are.

## What this project is

- **Goal**: A small robot arm simulator for the assignment:
  - 3D visualization of a simplified robot arm + workspace
  - Jog (joint) control panel
  - Add/move box obstacles
  - Collision warning (color/emissive change)
- **Tech**: Vite + React + TypeScript + Three.js via React Three Fiber + Drei + Zustand

## How to run

```bash
npm install
npm run dev
```

Useful scripts:

- `npm run lint`
- `npm run build`

## Controls (current)

- **Orbit camera**: drag to orbit (disabled while dragging gizmos)
- **Select robot**: click robot mesh → enables robot move gizmo (XZ only)
- **Move robot**:
  - click robot OR press **Move robot** in the Jog panel
  - use translate gizmo (X/Z only; Y constrained)
- **Jog joints** (main way):
  - click a joint row OR move its slider OR hold +/- buttons
  - step is **0.5°**
  - slider has a visible tick at **0°**
- **Joint rotation gizmo**:
  - appears only when a joint is selected **via Jog UI** (not from 3D handles)
- **Obstacles**:
  - **Add obstacle box** button
  - select obstacle from list or click in 3D
  - obstacle translate gizmo is shown when selected
- **Clear selection**: click empty space (Canvas pointer-miss clears selection)

## Robot joints (from `arm01.glb`)

We treat any node ending with `_Rotation` as a joint. The GLB currently exposes **9 joints**:

- `Arm01_Base_Rotation` (Robot Base Rotation)
- `Arm01_Arm_Rotation`
- `Arm01_End_Rotation`
- `Arm02_Base_Rotation`
- `Arm02_Arm_Rotation`
- `Arm02_End_Rotation`
- `Arm03_Base_Rotation`
- `Arm03_End_Rotation`
- `Tip_Rotation`

Default axis mapping is encoded in code (and can be overridden later):

- **Y**: `Arm01_Arm_Rotation`, `Arm01_End_Rotation`, `Arm02_Arm_Rotation`, `Arm02_End_Rotation`, `Arm03_End_Rotation`
- **X**: `Arm01_Base_Rotation`, `Arm02_Base_Rotation`, `Arm03_Base_Rotation`
- **Z**: `Tip_Rotation`

## Folder structure (current)

```
src/
  Three/
    RobotScene.tsx                # Canvas + composition, gizmo plumbing
    Light.tsx                     # Environment + directional light
    loaders/ObjectLoader.ts       # Shared GLTF loader wrapper
    Robot/
      RobotLoader.tsx             # Loads arm01.glb, initializes rig, enables robot selection
      Arm01Rig.ts                 # Joint order, axis defaults, home pose
      applyJointAngles.ts         # Apply joint angles to rotation nodes
    Gizmos/
      JointHandles.tsx            # Always-visible axis rings (visual only)
      JointGizmo.tsx              # TransformControls rotate (single-axis)
      ObstacleGizmo.tsx           # TransformControls translate for obstacles
    Obstacles/
      ObstaclesLayer.tsx          # Renders all obstacles
      ObstacleMesh.tsx            # Box obstacle mesh
    Collision/
      CollisionSystem.tsx         # Robot-mesh vs obstacle AABB + tinting
  UI/
    JogPanel.tsx                  # Jog controls + obstacle list/buttons
    CollapsiblePanel.tsx          # Collapsible right-side panel (handle)
    TopBar.tsx                    # Status badge
    BottomBar.tsx                 # Placeholder bottom bar
    layout/OverlayLayout.tsx      # UI overlay containers + event shielding
  store/useSimStore.ts            # Zustand store: joints, robot pose, obstacles, collision, selection
  utils/
    angles.ts
    box.ts
  assets/
    arm01.glb
```

## Current implementation notes (important)

### Rendering and scene

- `RobotScene.tsx` uses `frameloop="demand"` for performance. R3F will still re-render when internal controls/updates require it.
- Ground/grid z-fighting was mitigated with small Y offsets + polygonOffset on ground material.
- Joint rings are **visual** (not clickable) and show axis orientation; opacity indicates selection.

### State model (Zustand)

Key state in `src/store/useSimStore.ts`:

- **Robot joints**: `joints[]` with `angleRad`, `homeAngleRad`, `axis`, `stepRad`
- **Selection**: `selected` can be `joint | obstacle | robot | null`
- **Robot pose**: `robotPosition` (XZ translation used by robot move group)
- **Gizmo behavior**:
  - `jointGizmoActive`: only show joint TransformControls when activated from Jog UI
  - `transformInteracting`: prevents selection-clear while TransformControls is being used
- **Collision**: `collision.severity` + lists of colliding mesh names / obstacle ids

### Collision

- Collision is **mesh AABB vs obstacle AABB** at ~20Hz.
- Severity:
  - warning = near (distance threshold)
  - collision = intersect
- Visual feedback by tinting robot mesh materials (orange/red emissive).

### Reset behavior

- `Reset robot` resets:
  - robot XZ translation back to origin
  - all joint angles back to `homeAngleRad`

## Cold review (what’s good, what needs work)

### What’s strong

- **Clear separation** between 3D (`src/Three`), UI (`src/UI`), and state (`src/store`).
- **Model-driven joints**: joints are extracted from GLB naming convention and applied reliably.
- **Practical debugging UX**: always-visible joint axis rings help orient you in the scene.
- **Safety**: TransformControls “cancel” issues were handled with `transformInteracting`.

### Technical debt / risks

- **`frameloop=\"demand\"`**: great for perf, but you must ensure anything that should animate calls `invalidate()`. TransformControls typically triggers renders, but if you add continuous animations later, you’ll need explicit invalidation.
- **Joint rotation math**: current delta quaternion method is pragmatic, but if you need strict mechanical limits / IK later, you’ll probably want a more explicit kinematic model and per-joint local axis basis.
- **Obstacle spawn safety**: currently obstacles can spawn close to/inside robot (planned improvement).
- **Selection model**: selection is simple; future “select joint from 3D” is intentionally disabled right now.

## Next steps (highest value, aligned with the original plan)

1. **Obstacle spawn safety**: choose a spawn point that doesn’t intersect robot/other obstacles (simple AABB sampling).
2. **Axis override UI**: per-joint dropdown (X/Y/Z) that writes into `jointAxisOverrides`.
3. **Robot “home pose” tuning**: set realistic non-zero `HOME_DEG_BY_NAME` values for a nicer default posture.
4. **Better collision fidelity** (optional):
   - OBB per mesh or BVH if you want fewer false positives.
5. **Documentation**: update `README.md` beyond the placeholder.
