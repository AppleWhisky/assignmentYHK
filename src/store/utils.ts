export function clamp(n: number, min?: number, max?: number) {
  if (typeof min === 'number') n = Math.max(min, n);
  if (typeof max === 'number') n = Math.min(max, n);
  return n;
}

export function rad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function makeId() {
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

