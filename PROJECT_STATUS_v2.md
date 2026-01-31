# Project Status v2 — Robot Arm Simulator (R3F)

This document reflects the **current code state** on branch `ver2_newUI`: implemented features, UX/controls, and where things live.

## Assignment requirements coverage

- **Three.js 3D visualization**: Implemented (R3F + Drei).
  - Simplified robot arm (3+ axes): implemented via `_Rotation` joint nodes from `arm01.glb`.
  - Workspace: ground plane + grid.
- **Jog controller UI**: Implemented.
  - Joint angle control via sliders and hold-to-repeat +/- buttons.
  - Robot base yaw control + robot XZ translation control.
- **Obstacle add/place**: Implemented.
  - Add box obstacles, select from UI or click in 3D, translate via gizmo.
  - Edit pose/size in UI.
- **Collision visual warning**: Implemented.
  - AABB-based robot-mesh vs obstacle collision & “near” warning, with color/emissive feedback.

## How to run

```bash
npm install
npm run dev
```

Useful scripts:

- `npm run lint`
- `npm run build`

## UX / UI (v2 layout)

- **Top HUD (`TopBar`)**
  - Shows selection breadcrumb, collision summary (“Near/Hit”), and system severity badge.
  - Controls:
    - **Boxes** toggle (shows debug AABBs)
    - **Home view** (reset OrbitControls)
    - **Reset pose** (robot pose only)
    - **Reset scene** (robot pose + obstacles + selection + collision + debug flags + camera)
  - “SIM_LIVE” indicator (visual only).
- **Side panels**
  - Left: **Obstacles** panel
  - Right: **Jog** panel
  - Both are **collapsible** via the edge handle (`CollapsiblePanel`).
  - Panel “tone” changes on **warning/collision** (subtle border/glow via CSS).
- **Bottom bar**
  - Present as a placeholder (“reserved for future tools”).
- **Input shielding**
  - Side panels stop wheel/pointer propagation so OrbitControls doesn’t fight UI interactions (`OverlayLayout`).

## Controls (current)

### Camera

- **Orbit**: drag to orbit (disabled while any TransformControls gizmo is dragging).
- **Clear selection**: click empty space (Canvas `onPointerMissed`) — guarded so gizmo interactions won’t accidentally clear selection.

### Robot

- **Select robot**: click robot mesh, or press **Move robot** in the Jog panel.
- **Move robot (XZ only)**: translate gizmo when selected as “Robot”.
- **Robot base yaw**: in Jog panel “Robot Base” section (slider or hold-to-repeat +/-).
- **Reset pose**: resets robot translation + yaw + all joints back to home.

### Jog joints

- **Joint control methods**
  - Click a joint row label to select it (also enables joint rotation gizmo).
  - Move slider to set absolute angle.
  - Hold +/- to nudge continuously.
- **Step**: 0.5°
- **Joint rotation gizmo**
  - Shown **only when joint selection is made from the Jog UI** (`jointGizmoActive`).
  - Single-axis rotate based on each joint’s configured axis.

### Obstacles

- **Add obstacle box**: button in Obstacles panel.
  - Spawn point attempts to avoid robot footprint + other obstacles (simple XZ “radius” check).
- **Select**
  - From obstacle list in UI, or click obstacle in 3D.
- **Move**: translate gizmo when an obstacle is selected.
- **Edit**: position / rotation / scale in the “Properties” section.

## Robot joints (from `arm01.glb`)

### Joint discovery rule

- Any node with a name ending in **`_Rotation`** is treated as a potential joint.

### Controllable joints (currently exposed in Jog UI)

The rig intentionally exposes **7 joints** (DOFs) in a stable order:

- `Arm01_Base_Rotation` (Robot Base Rotation — axis X by default)
- `Arm01_Arm_Rotation` (axis Y)
- `Arm02_Base_Rotation` (axis X)
- `Arm02_Arm_Rotation` (axis Y)
- `Arm03_Base_Rotation` (axis X)
- `Arm03_End_Rotation` (axis Y)
- `Tip_Rotation` (axis Z)

Notes:

- Some `_Rotation` nodes exist in the GLB but are intentionally **excluded** from controls (currently: `Arm01_End_Rotation`, `Arm02_End_Rotation`) because they were observed to move redundantly.
- Robot **yaw** is a separate world-space control (`robotYawRad`) and is not part of the GLB joints list above.

## Collision system (current)

- **Method**: per-robot-mesh **AABB** vs per-obstacle **AABB** in world space.
  - Robot mesh AABB: from `mesh.geometry.boundingBox` transformed by `mesh.matrixWorld`.
  - Obstacle AABB: `Box3.setFromObject(obstacleObject)` (robust to obstacle rotation/scale).
- **Update rate**: ~20Hz.
- **Severity**
  - `collision`: AABB intersects
  - `warning`: AABB distance < `0.03` (world units)
- **Visual feedback**
  - Robot meshes: tinted material color + emissive (orange/red).
  - Obstacles: tinted box material (orange/red) + emissive; selection is blue.
- **Debug view**
  - Toggle **Boxes** in Top HUD to render AABB helpers for robot meshes and obstacles.

## Architecture / where to look

```
src/
  Three/
    RobotScene.tsx                # Canvas + composition, controls, selection clear, gizmos
    Light.tsx                     # Environment + directional light
    loaders/ObjectLoader.ts       # GLTF loader wrapper
    Robot/
      RobotLoader.tsx             # Loads arm01.glb, initializes rig, clones materials
      Arm01Rig.ts                 # Joint order, axis defaults, excluded joints, home pose
      applyJointAngles.ts         # Apply joint angles to `_Rotation` nodes
    Gizmos/
      JointHandles.tsx            # Always-visible axis rings (visual only)
      JointGizmo.tsx              # TransformControls rotate for selected joint (single-axis)
      ObstacleGizmo.tsx           # TransformControls translate for selected obstacle
    Obstacles/
      ObstaclesLayer.tsx          # Renders all obstacles + registers Object3Ds
      ObstacleMesh.tsx            # Box obstacle mesh + selection + tint
    Collision/
      CollisionSystem.tsx         # Robot-mesh vs obstacle AABB + tinting + store collision state
      CollisionDebugBoxes.tsx     # Optional AABB helpers (Top HUD toggle)
  UI/
    TopBar.tsx                    # HUD (severity, selection, debug toggle, resets)
    JogPanel.tsx                  # Jog controls (joints + base yaw + move robot)
    ObstaclePanel.tsx             # Add/select/edit obstacles
    CollapsiblePanel.tsx          # Collapsible side panel shell
    BottomBar.tsx                 # Placeholder bar
    layout/OverlayLayout.tsx      # UI overlay containers + event shielding
  store/useSimStore.ts            # Zustand state: joints, robot pose, obstacles, collision, selection
  utils/
    angles.ts
    box.ts
  assets/
    arm01.glb
```

## Known limitations / next improvements (optional)

- **Collision fidelity**: AABB is fast but can produce false positives (especially with rotation). Upgrade options include OBB, BVH triangle collision, or a physics engine.
- **Axis override UI**: store supports per-joint axis overrides (`jointAxisOverrides`), but there’s no user-facing UI to change it yet.
- **Home pose tuning**: `HOME_DEG_BY_NAME` is currently zeroed; setting nicer defaults improves demo quality.

