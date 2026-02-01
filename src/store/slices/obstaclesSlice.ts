import type { StateCreator } from 'zustand';
import type { ObstacleState, SimState } from '@/store/types';
import { makeId } from '@/store/utils';

export type ObstaclesSlice = Pick<
  SimState,
  | 'obstacles'
  | 'addObstacle'
  | 'removeObstacle'
  | 'updateObstaclePose'
  | 'updateObstacleSize'
  | 'obstacleRegistryVersion'
  | 'bumpObstacleRegistryVersion'
>;

function randBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function halfXZ(size: [number, number, number]) {
  return Math.max(size[0], size[2]) * 0.5;
}

function isSpawnSafeXZ(
  x: number,
  z: number,
  size: [number, number, number],
  robotPosition: [number, number, number],
  obstacles: ObstacleState[],
) {
  // Very simple safety: avoid robot footprint and existing obstacle footprints (circle approximation in XZ).
  const myR = halfXZ(size);
  const robotAvoidR = 0.95; // heuristic world-space radius around robot base
  const dxr = x - robotPosition[0];
  const dzr = z - robotPosition[2];
  if (dxr * dxr + dzr * dzr < (robotAvoidR + myR) * (robotAvoidR + myR)) return false;

  for (const o of obstacles) {
    const r = halfXZ(o.size);
    const dx = x - o.position[0];
    const dz = z - o.position[2];
    const minR = r + myR + 0.08; // small gap
    if (dx * dx + dz * dz < minR * minR) return false;
  }

  return true;
}

function chooseSpawnXZ(
  size: [number, number, number],
  robotPosition: [number, number, number],
  obstacles: ObstacleState[],
): [number, number] {
  // Sample a ring around the robot and pick the first safe point.
  const baseR = 1.2 + obstacles.length * 0.1;
  for (let i = 0; i < 32; i++) {
    const a = randBetween(0, Math.PI * 2);
    const r = baseR + randBetween(0, 0.6);
    const x = robotPosition[0] + Math.cos(a) * r;
    const z = robotPosition[2] + Math.sin(a) * r;
    if (isSpawnSafeXZ(x, z, size, robotPosition, obstacles)) return [x, z];
  }
  // Fallback: still offset from robot, even if it overlaps another obstacle.
  return [robotPosition[0] + baseR, robotPosition[2]];
}

export const createObstaclesSlice: StateCreator<SimState, [], [], ObstaclesSlice> = (set, _get) => ({
  obstacles: [],

  obstacleRegistryVersion: 0,
  bumpObstacleRegistryVersion: () =>
    set((s) => ({ obstacleRegistryVersion: s.obstacleRegistryVersion + 1 })),

  addObstacle: () =>
    set((s) => {
      const id = makeId();
      const idx = s.obstacles.length + 1;
      const size: [number, number, number] = [0.55, 0.55, 0.55];
      const [x, z] = chooseSpawnXZ(size, s.robotPosition, s.obstacles);
      const y = size[1] * 0.5; // sit on the floor
      const basePos: [number, number, number] = [x, y, z];
      return {
        obstacles: [
          ...s.obstacles,
          {
            id,
            name: `Obstacle ${idx}`,
            position: basePos,
            rotation: [0, 0, 0],
            size,
          },
        ],
        selected: { kind: 'obstacle', id },
      };
    }),

  removeObstacle: (id) =>
    set((s) => ({
      obstacles: s.obstacles.filter((o) => o.id !== id),
      selected: s.selected?.kind === 'obstacle' && s.selected.id === id ? null : s.selected,
    })),

  updateObstaclePose: (id, pose) =>
    set((s) => ({
      obstacles: s.obstacles.map((o) =>
        o.id === id
          ? {
              ...o,
              position: pose.position ?? o.position,
              rotation: pose.rotation ?? o.rotation,
            }
          : o,
      ),
    })),

  updateObstacleSize: (id, size) =>
    set((s) => ({
      obstacles: s.obstacles.map((o) =>
        o.id === id
          ? {
              ...o,
              size: [Math.max(0, size[0]), Math.max(0, size[1]), Math.max(0, size[2])],
            }
          : o,
      ),
    })),
});

