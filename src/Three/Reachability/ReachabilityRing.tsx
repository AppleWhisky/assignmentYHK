import { Line } from '@react-three/drei';
import { useMemo } from 'react';

export const ReachabilityRing = (props: {
  radius: number;
  y?: number;
  color?: string;
}) => {
  const y = props.y ?? 0.002;
  const color = props.color ?? '#60a5fa';

  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    const segments = 144;
    const r = Math.max(0, props.radius);
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
    }
    return pts;
  }, [props.radius, y]);

  if (!Number.isFinite(props.radius) || props.radius <= 0) return null;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={2}
      transparent
      opacity={0.35}
      dashed
      dashSize={0.12}
      gapSize={0.08}
      depthTest={false}
      depthWrite={false}
      frustumCulled={false}
    />
  );
};

