import { Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { Axis } from '@/store/useSimStore';

const AXIS_VEC: Record<Axis, Vector3> = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
};

export type JointRuntime = {
  name: string;
  axis: Axis;
  object: Object3D;
  baseQuat: Quaternion;
};

const _delta = new Quaternion();

export function applyJointAngle(joint: JointRuntime, angleRad: number) {
  _delta.setFromAxisAngle(AXIS_VEC[joint.axis], angleRad);
  joint.object.quaternion.copy(joint.baseQuat).multiply(_delta);
  joint.object.updateMatrixWorld(true);
}
