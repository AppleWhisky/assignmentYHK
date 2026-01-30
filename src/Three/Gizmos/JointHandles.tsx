import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useMemo, useRef } from 'react';
import type { Group, Object3D } from 'three';
import { Quaternion, Vector3 } from 'three';
import { useSimStore } from '@/store/useSimStore';
import type { Axis } from '@/store/useSimStore';

const _p = new Vector3();
const _q = new Quaternion();
const _qAxis = new Quaternion();

const AXIS_COLOR: Record<Axis, string> = {
  x: '#ff5c6c',
  y: '#35d07f',
  z: '#2d6cff',
};

function axisCircleOffsetQuat(axis: Axis) {
  // Our circle points lie in XY plane (normal +Z). Rotate so the circle normal matches the joint axis.
  // Z axis => normal Z => no change
  // Y axis => normal Y => rotate around X -90deg
  // X axis => normal X => rotate around Y +90deg
  if (axis === 'y') return _qAxis.setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2).clone();
  if (axis === 'x') return _qAxis.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2).clone();
  return new Quaternion(); // identity
}

export const JointHandles = (props: { nodes: Object3D[] }) => {
  const joints = useSimStore((s) => s.joints);
  const axisByName = useMemo(() => new Map(joints.map((j) => [j.name, j.axis] as const)), [joints]);

  const circlePoints = useMemo(() => {
    const pts: [number, number, number][] = [];
    const radius = 0.12;
    const segments = 96;
    for (let i = 0; i < segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      pts.push([Math.cos(t) * radius, Math.sin(t) * radius, 0]);
    }
    // close the loop
    pts.push(pts[0]);
    return pts;
  }, []);

  return (
    <>
      {props.nodes.map((n) => (
        <JointHandle
          key={n.uuid}
          node={n}
          axis={(axisByName.get(n.name) ?? 'z') as Axis}
          circlePoints={circlePoints}
        />
      ))}
    </>
  );
};

const JointHandle = (props: {
  node: Object3D;
  axis: Axis;
  circlePoints: [number, number, number][];
}) => {
  const groupRef = useRef<Group | null>(null);
  const selected = useSimStore((s) => s.selected);

  const isSelected = selected?.kind === 'joint' && selected.name === props.node.name;

  const lineColor = useMemo(() => AXIS_COLOR[props.axis], [props.axis]);
  const offsetQuat = useMemo(() => axisCircleOffsetQuat(props.axis), [props.axis]);
  const opacity = isSelected ? 0.9 : 0.2;

  useFrame(() => {
    if (!groupRef.current) return;
    props.node.getWorldPosition(_p);
    props.node.getWorldQuaternion(_q);
    groupRef.current.position.copy(_p);
    groupRef.current.quaternion.copy(_q).multiply(offsetQuat);
  });

  return (
    <group ref={groupRef} frustumCulled={false}>
      {/* Visible: thick line circle aligned to joint axis */}
      <Line
        points={props.circlePoints}
        color={lineColor}
        lineWidth={3}
        transparent
        opacity={opacity}
        depthTest={false}
        depthWrite={false}
        worldUnits={false}
        frustumCulled={false}
      />
    </group>
  );
};
