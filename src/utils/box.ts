import type { Box3 } from 'three';
import { Vector3 } from 'three';

export function boxDistance(a: Box3, b: Box3) {
  const dx = axisGap(a.min.x, a.max.x, b.min.x, b.max.x);
  const dy = axisGap(a.min.y, a.max.y, b.min.y, b.max.y);
  const dz = axisGap(a.min.z, a.max.z, b.min.z, b.max.z);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function axisGap(aMin: number, aMax: number, bMin: number, bMax: number) {
  if (aMax < bMin) return bMin - aMax;
  if (bMax < aMin) return aMin - bMax;
  return 0;
}

const _v = new Vector3();
export function boxCenter(box: Box3) {
  return box.getCenter(_v);
}
