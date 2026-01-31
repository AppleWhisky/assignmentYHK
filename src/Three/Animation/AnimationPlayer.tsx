import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { degToRad } from '@/utils/angles';
import { useSimStore } from '@/store/useSimStore';
import type { AnimNode, AnimationDefV3 } from '@/store/useSimStore';

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

function getNodeById(id: string, nodes: AnimNode[]) {
  return nodes.find((n) => n.id === id) ?? null;
}

export const AnimationPlayer = () => {
  const invalidate = useThree((s) => s.invalidate);
  const lastAnimIdRef = useRef<string | null>(null);

  useFrame((_, dt) => {
    const s = useSimStore.getState();
    const pb = s.playback;
    if (pb.status !== 'playing') {
      lastAnimIdRef.current = null;
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
      invalidate(); // critical: schedule the next frame under frameloop="demand"
      return;
    }

    const layerKeys = pb.layerKeys;
    const totalSlots = layerKeys.length;
    if (totalSlots <= 0) {
      s.stopPlayback();
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
    for (const node of anim.nodes) {
      if (Math.floor(node.data.layer) !== activeLayer) continue;
      const step = node.data;
      const valueDeg = lerp(step.startDeg, step.endDeg, alpha);
      if (step.target.kind === 'baseYaw') s.setRobotYawRad(degToRad(valueDeg));
      else s.setJointAngle(step.target.name, degToRad(valueDeg));
    }

    if (anim.loopMode === 'none' && nextPlayhead >= totalDuration) {
      s.stopPlayback();
      invalidate();
      return;
    }

    s.setPlayback({ playhead: nextPlayhead, direction: nextDirection });

    // Ensure rendering continues under frameloop="demand"
    invalidate();
  });

  return null;
};

