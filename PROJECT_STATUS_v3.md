# Project Status v3 — Robot Arm Simulator (R3F)

This document reflects the **current code state** after the “Animator” feature expansion (timeline-based authoring + presets from `public/`).

## Assignment requirements coverage

- **Three.js 3D visualization**: Implemented (R3F + Drei).
  - Robot arm (3+ axes): joints extracted from `arm01.glb` `_Rotation` nodes.
  - Workspace: ground + grid.
- **Jog controller UI**: Implemented.
  - Joint sliders + hold-to-repeat +/-.
  - Robot base yaw control + robot XZ translation control.
- **Obstacle add/place**: Implemented.
  - Add/select/move box obstacles with gizmos.
- **Collision warning**: Implemented.
  - Robot-mesh AABB vs obstacle AABB “warning/collision”, with material tinting.

## How to run

```bash
npm install
npm run dev
```

Useful scripts:

- `npm run build`

## UX / UI (current)

### Top HUD (`TopBar`)

- **Animator** button: opens/closes full-screen Animation editor overlay.
- **Boxes** toggle: shows collision debug AABBs.
- **Home view / Reset pose / Reset scene**: same as v2.

### Side panels

- Left: **Obstacles**
- Right: **Jog** (includes Simulation controls)
- Collapsible + tone changes on warning/collision.

## Animator (timeline editor)

### What it is

- A full-screen overlay editor built on a **freeform canvas** (drag boxes around), while the animation semantics are **timeline layers**.

### Core concept: Layers = absolute time slots

- Each box has an integer **Layer** \(>= 1\).
- **Layer \(N\)** plays at time \((N-1)~N\) seconds.
- Missing layers become **automatic rest slots** (no motion, pose holds).
- Total duration = **maxLayer seconds**.

### Keyframe model (End-only; Start is automatic)

- Users edit **End (deg)**.
- **Start (deg)** is **read-only** and automatically computed:
  - start = previous layer’s end for the same target, otherwise **0** (first appearance).
- This prevents “teleport” jumps between layers.

### Targets

- `BaseYaw` (robot yaw)
- Any joint from the current rig (`arm01.glb` joints list)

### Timeline mini-map (Inspector)

- Inspector always shows a **vertical layer stack** preview:
  - shows layers 1..maxLayer
  - shows rest layers (empty) as thin, non-clickable rows
  - clicking a non-empty layer highlights all boxes in that layer on the canvas

### Auto Arrange (Excel layout)

- **Auto Arrange** button arranges boxes into an Excel-like grid:
  - columns = layer (left → right)
  - rows = boxes inside the same layer (top → bottom)

### Layer color labels

- Each layer has a deterministic, distinct color (golden-angle hue distribution).
- The box header shows a colored dot + subtle tint so you can visually group by layer.

## Simulation playback (Jog panel)

- Jog panel has **Simulation** section:
  - Select an animation preset
  - **Simulation Start / Stop**
  - Loop modes supported: `none`, `pingpong`
- Playback uses a **single playhead** with `frameloop="demand"` invalidation for smooth playback.
- On start, the simulator resets controllable targets to baseline (0) so that “first appearance starts from 0” is consistent.

## Animation presets (no localStorage)

- localStorage persistence was intentionally removed to avoid stale/bad animations.
- Animations are loaded from `public/animations` via a manifest file:
  - `public/animations/index.json`
  - Each entry is fetched at runtime from `/animations/<file>`
- Presets can be exported to JSON from the Animator and then added to `public/animations/` + referenced from the manifest.

Example manifest:

```json
{
  "version": 1,
  "files": ["my-demo.json"]
}
```

## Key files

```
src/
  store/useSimStore.ts
    - AnimationDefV3 (layer timeline)
    - preset loading from /animations/index.json
    - auto-start normalization + playback baseline
  UI/AnimationEditor/AnimationEditorOverlay.tsx
    - animator overlay, timeline mini-map, auto arrange, layer coloring
  Three/Animation/AnimationPlayer.tsx
    - playhead-driven playback (supports pingpong)
  UI/JogPanel.tsx
    - Simulation controls + preset load error handling
public/
  animations/
    index.json
```

