import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { degToRad } from '@/utils/angles';
import { useSimStore } from '@/store/useSimStore';
import type { AnimationDefV3 } from '@/store/useSimStore';

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function clamp01(n: number) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function getAnimById(id: string | null, list: AnimationDefV3[]) {
  if (!id) return null;
  return list.find((a) => a.id === id) ?? null;
}

function pairKey(kind: 'obstacle' | 'self', a: string, b: string) {
  return `${kind}|${a}|${b}`;
}

export const AnimationPlayer = () => {
  const invalidate = useThree((s) => s.invalidate);
  const lastAnimIdRef = useRef<string | null>(null);
  const prevPairsRef = useRef<Set<string>>(new Set());
  const simTimeRef = useRef<number>(0);

  useFrame((_, dt) => {
    const s = useSimStore.getState();
    const pb = s.playback;
    if (pb.status !== 'playing') {
      lastAnimIdRef.current = null;
      prevPairsRef.current.clear();
      simTimeRef.current = 0;
      return;
    }

    const anim = getAnimById(pb.animationId, s.savedAnimations);
    if (!anim) {
      s.stopPlayback();
      invalidate(); // demand frameloop: ensure UI/scene updates flush
      return;
    }

    // Detect animation switches mid-play (rare but safe).
    if (lastAnimIdRef.current !== anim.id) {
      lastAnimIdRef.current = anim.id;
      s.setPlayback({ playhead: 0, direction: 1 });
      prevPairsRef.current.clear();
      simTimeRef.current = 0;
      invalidate(); // critical: schedule the next frame under frameloop="demand"
      return;
    }

    // Monotonic simulation time (keeps increasing even when playhead loops/pingpongs).
    simTimeRef.current += Math.max(0, dt);

    const layerKeys = pb.layerKeys;
    const totalSlots = layerKeys.length;
    if (totalSlots <= 0) {
      s.stopPlayback('ended');
      s.setReportModalOpen(true);
      invalidate();
      return;
    }

    const slotDuration = 1.0; // fixed v3
    const totalDuration = totalSlots * slotDuration;

    let nextDirection: 1 | -1 = pb.direction;
    let nextPlayhead =
      anim.loopMode === 'pingpong' ? pb.playhead + dt * pb.direction : pb.playhead + dt;

    if (anim.loopMode === 'pingpong') {
      if (nextPlayhead > totalDuration) {
        nextPlayhead = totalDuration;
        nextDirection = -1;
      } else if (nextPlayhead < 0) {
        nextPlayhead = 0;
        nextDirection = 1;
      }
    } else {
      if (nextPlayhead >= totalDuration) {
        // Clamp to end so final pose is applied, then stop.
        nextPlayhead = totalDuration;
      }
    }

    // Determine active slot index and local alpha (works both forward and backward).
    const safePlayhead =
      totalDuration > 0 ? Math.min(nextPlayhead, Math.max(0, totalDuration - 1e-9)) : 0;
    const slotIdx = Math.min(Math.max(Math.floor(safePlayhead / slotDuration), 0), totalSlots - 1);
    const localT = safePlayhead - slotIdx * slotDuration;
    const alpha = clamp01(localT / slotDuration);

    const activeLayer = layerKeys[slotIdx]!;
    const activeLayerNumber = slotIdx + 1;

    // --- Collision logging & stop policy ---
    const events: {
      tSec: number;
      layer: number;
      kind: 'obstacle' | 'self';
      a: string;
      b: string;
    }[] = [];
    const nowT = Math.max(0, simTimeRef.current);

    // Track collision *start edges* (enter events), so loops can log again when a collision re-occurs.
    const currentPairs = new Set<string>();

    const obstaclePairs = s.collision.collidingPairs ?? [];
    for (const p of obstaclePairs) {
      if (!p.mesh || !p.obstacleId) continue;
      const a = p.mesh;
      const b = `Obstacle:${p.obstacleId}`;
      const key = pairKey('obstacle', a, b);
      currentPairs.add(key);
      if (!prevPairsRef.current.has(key)) {
        events.push({ tSec: nowT, layer: activeLayerNumber, kind: 'obstacle', a, b });
      }
    }

    if (s.playbackOptions.includeSelfCollision) {
      const selfPairs = s.selfCollision.pairs ?? [];
      for (const p of selfPairs) {
        const a = p.a;
        const b = p.b;
        const key = pairKey('self', a, b);
        currentPairs.add(key);
        if (!prevPairsRef.current.has(key)) {
          events.push({ tSec: nowT, layer: activeLayerNumber, kind: 'self', a, b });
        }
      }
    }

    prevPairsRef.current = currentPairs;

    if (events.length) s.addPlaybackReportEvents(events);

    const hasObstacleCollision =
      s.collision.severity === 'collision' && (s.collision.collidingPairs?.length ?? 0) > 0;
    const hasSelfCollision =
      s.playbackOptions.includeSelfCollision && (s.selfCollision.pairs?.length ?? 0) > 0;
    const hasCollision = hasObstacleCollision || hasSelfCollision;

    if (s.playbackOptions.stopOnCollision && hasCollision) {
      s.stopPlayback('collision');
      s.setReportModalOpen(true);
      invalidate();
      return;
    }
    for (const node of anim.nodes) {
      if (Math.floor(node.data.layer) !== activeLayer) continue;
      const step = node.data;
      const valueDeg = lerp(step.startDeg, step.endDeg, alpha);
      if (step.target.kind === 'baseYaw') s.setRobotYawRad(degToRad(valueDeg));
      else s.setJointAngle(step.target.name, degToRad(valueDeg));
    }

    if (anim.loopMode === 'none' && nextPlayhead >= totalDuration) {
      s.stopPlayback('ended');
      s.setReportModalOpen(true);
      invalidate();
      return;
    }

    s.setPlayback({ playhead: nextPlayhead, direction: nextDirection });

    // Ensure rendering continues under frameloop="demand"
    invalidate();
  });

  return null;
};

