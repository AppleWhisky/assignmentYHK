export function radToDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

export function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function clamp(n: number, min?: number, max?: number) {
  if (typeof min === 'number') n = Math.max(min, n);
  if (typeof max === 'number') n = Math.min(max, n);
  return n;
}
