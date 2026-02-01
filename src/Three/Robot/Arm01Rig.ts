import type { Object3D } from 'three';
import { Box3, Mesh, Vector3 } from 'three';
import type { Axis, JointState } from '@/store/useSimStore';
import { DEFAULT_JOINT_STEP_RAD } from '@/store/useSimStore';

export type ArmRig = {
  rotationNodes: Object3D[];
  joints: JointState[];
};

const _box = new Box3();
const _size = new Vector3();

// Desired joint order + default axis mapping (from your latest spec)
const JOINT_ORDER: string[] = [
  'Arm01_Base_Rotation', // Robot Base Rotation
  'Arm01_Arm_Rotation',
  'Arm02_Base_Rotation',
  'Arm02_Arm_Rotation',
  'Arm03_Base_Rotation',
  'Arm03_End_Rotation',
  'Tip_Rotation',
];

// Joints present in the GLB but intentionally not exposed as controllable DOFs.
// (These were observed to move redundantly with their corresponding joints.)
const EXCLUDED_JOINTS = new Set<string>(['Arm01_End_Rotation', 'Arm02_End_Rotation']);

const DEFAULT_AXIS_BY_NAME: Record<string, Axis> = {
  // Normal cylinder shape joints
  Arm01_Arm_Rotation: 'y',
  Arm02_Arm_Rotation: 'y',
  Arm03_End_Rotation: 'y',

  // X axis joints (vertical-long cylinders on the sides)
  Arm01_Base_Rotation: 'x', // Robot Base Rotation
  Arm02_Base_Rotation: 'x',
  Arm03_Base_Rotation: 'x',

  // Special case
  Tip_Rotation: 'z',
};

const LABEL_BY_NAME: Record<string, string> = {
  Arm01_Base_Rotation: 'Robot Base Rotation',
};

// Home pose (degrees). Keep this explicit so “Reset Robot” has a stable target.
const HOME_DEG_BY_NAME: Record<string, number> = {
  Arm01_Base_Rotation: 0,
  Arm01_Arm_Rotation: 0,
  Arm02_Base_Rotation: 0,
  Arm02_Arm_Rotation: 0,
  Arm03_Base_Rotation: 0,
  Arm03_End_Rotation: 0,
  Tip_Rotation: 0,
};

// Joint limits (degrees). Hardcode for stability (model-specific).
// Tune these values to match the intended robot constraints.
const MIN_DEG_BY_NAME: Partial<Record<string, number>> = {
  Arm01_Base_Rotation: -90,
  Arm01_Arm_Rotation: -180,
  Arm02_Base_Rotation: -155,
  Arm02_Arm_Rotation: -180,
  Arm03_Base_Rotation: -180,
  Arm03_End_Rotation: -180,
  Tip_Rotation: -180,
};

const MAX_DEG_BY_NAME: Partial<Record<string, number>> = {
  Arm01_Base_Rotation: 90,
  Arm01_Arm_Rotation: 180,
  Arm02_Base_Rotation: 155,
  Arm02_Arm_Rotation: 180,
  Arm03_Base_Rotation: 180,
  Arm03_End_Rotation: 180,
  Tip_Rotation: 180,
};

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function autoDetectAxisFromCylinder(rotationNode: Object3D): Axis | null {
  // Heuristic: find a mesh beneath the rotation node and choose axis:
  // - if it's "vertically long" => 'x'
  // - else (horizontally long) => 'z'
  //
  // This follows your rule and is intentionally simple; overrides exist for correctness.
  let bestSize: Vector3 | null = null;
  let bestScore = -Infinity;
  rotationNode.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    const geom = obj.geometry;
    if (!geom) return;
    if (!geom.boundingBox) geom.computeBoundingBox?.();
    if (!geom.boundingBox) return;
    _box.copy(geom.boundingBox);
    _box.getSize(_size);
    const score = Math.max(_size.x, _size.y, _size.z);
    if (score > bestScore) {
      bestScore = score;
      bestSize = _size.clone();
    }
  });

  if (!bestSize) return null;
  const { x, y, z } = bestSize;
  const isVerticalLong = y >= x && y >= z;
  return isVerticalLong ? 'x' : 'z';
}

export function buildArm01Rig(root: Object3D, axisOverrides: Record<string, Axis>): ArmRig {
  const rotationNodes: Object3D[] = [];
  root.traverse((obj) => {
    if (obj.name && obj.name.endsWith('_Rotation')) rotationNodes.push(obj);
  });

  const includedRotationNodes = rotationNodes.filter((n) => !EXCLUDED_JOINTS.has(n.name));
  const byName = new Map(includedRotationNodes.map((n) => [n.name, n] as const));
  const ordered: Object3D[] = [];

  // 1) Put known joints in desired order
  for (const name of JOINT_ORDER) {
    const n = byName.get(name);
    if (n) ordered.push(n);
  }
  // 2) Append any remaining `_Rotation` nodes (stable alpha order)
  const remaining = includedRotationNodes
    .filter((n) => !JOINT_ORDER.includes(n.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  ordered.push(...remaining);

  const joints: JointState[] = ordered.map((n, idx) => {
    const overridden = axisOverrides[n.name];
    const detected = autoDetectAxisFromCylinder(n);
    const defaultAxis = DEFAULT_AXIS_BY_NAME[n.name];
    const axis: Axis = overridden ?? defaultAxis ?? detected ?? 'z';
    const homeAngleRad = degToRad(HOME_DEG_BY_NAME[n.name] ?? 0);
    const minDeg = MIN_DEG_BY_NAME[n.name];
    const maxDeg = MAX_DEG_BY_NAME[n.name];
    return {
      name: n.name,
      label: `J${idx + 1} ${(LABEL_BY_NAME[n.name] ?? n.name).replace(/_Rotation$/, '')}`,
      axis,
      angleRad: homeAngleRad,
      homeAngleRad,
      minRad: typeof minDeg === 'number' ? degToRad(minDeg) : undefined,
      maxRad: typeof maxDeg === 'number' ? degToRad(maxDeg) : undefined,
      stepRad: DEFAULT_JOINT_STEP_RAD,
    };
  });

  return { rotationNodes: ordered, joints };
}
