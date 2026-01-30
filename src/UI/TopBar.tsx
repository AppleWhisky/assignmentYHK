import { useSimStore } from '@/store/useSimStore';

export const TopBar = () => {
  const collision = useSimStore((s) => s.collision);
  const dotClass = collision.severity === 'collision' ? 'dot isColliding' : 'dot';
  const label =
    collision.severity === 'collision'
      ? 'Collision'
      : collision.severity === 'warning'
        ? 'Warning'
        : 'OK';

  return (
    <div className="badge" style={{ marginTop: 0 }}>
      <span className={dotClass} />
      <span>Robot Arm Simulator</span>
      <span style={{ opacity: 0.8 }}>·</span>
      <span>{label}</span>
    </div>
  );
};
