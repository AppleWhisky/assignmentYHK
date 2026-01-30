import { degToRad, radToDeg } from '@/utils/angles';
import { useSimStore } from '@/store/useSimStore';

const clampNumber = (n: number) => (Number.isFinite(n) ? n : 0);

const Vec3Row = (props: {
  label: string;
  value: [number, number, number];
  step?: number;
  onChange: (next: [number, number, number]) => void;
}) => {
  const step = props.step ?? 0.01;
  const [x, y, z] = props.value;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 1fr', gap: 6, alignItems: 'center' }}>
      <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700 }}>{props.label}</div>
      <input
        type="number"
        value={x}
        step={step}
        onChange={(e) => props.onChange([clampNumber(Number(e.target.value)), y, z])}
        style={{ width: '100%' }}
      />
      <input
        type="number"
        value={y}
        step={step}
        onChange={(e) => props.onChange([x, clampNumber(Number(e.target.value)), z])}
        style={{ width: '100%' }}
      />
      <input
        type="number"
        value={z}
        step={step}
        onChange={(e) => props.onChange([x, y, clampNumber(Number(e.target.value))])}
        style={{ width: '100%' }}
      />
    </div>
  );
};

export const ObstaclePanel = () => {
  const obstacles = useSimStore((s) => s.obstacles);
  const addObstacle = useSimStore((s) => s.addObstacle);
  const removeObstacle = useSimStore((s) => s.removeObstacle);
  const selected = useSimStore((s) => s.selected);
  const setSelected = useSimStore((s) => s.setSelected);
  const updateObstaclePose = useSimStore((s) => s.updateObstaclePose);
  const updateObstacleSize = useSimStore((s) => s.updateObstacleSize);

  const collision = useSimStore((s) => s.collision);

  const selectedObstacleId = selected?.kind === 'obstacle' ? selected.id : null;
  const selectedObstacle = selectedObstacleId
    ? obstacles.find((o) => o.id === selectedObstacleId) ?? null
    : null;

  const collidingIds = new Set(collision.collidingObstacleIds);
  const warningIds = new Set(collision.warningObstacleIds);

  return (
    <div>
      <div className="btnRow" style={{ marginTop: 0 }}>
        <button onClick={() => addObstacle()}>Add obstacle box</button>
      </div>

      <h2 style={{ marginTop: 12 }}>Obstacles</h2>
      {obstacles.length ? (
        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          {obstacles.map((o) => {
            const isSelected = selected?.kind === 'obstacle' && selected.id === o.id;
            const isColliding = collidingIds.has(o.id);
            const isWarning = !isColliding && warningIds.has(o.id);
            const tint = isColliding
              ? 'rgba(255, 92, 108, 0.10)'
              : isWarning
                ? 'rgba(255, 154, 61, 0.10)'
                : 'transparent';
            const dot = isColliding ? '#ff5c6c' : isWarning ? '#ff9a3d' : '#35d07f';

            return (
              <div
                key={o.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: 8,
                  alignItems: 'center',
                  background: tint,
                  borderRadius: 10,
                  padding: 2,
                }}
              >
                <button
                  style={{
                    flex: 1,
                    textAlign: 'left' as const,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderColor: isSelected ? 'rgba(45,108,255,0.45)' : undefined,
                  }}
                  onClick={() => setSelected({ kind: 'obstacle', id: o.id })}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: dot,
                      flex: '0 0 auto',
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.name}
                  </span>
                </button>
                <button onClick={() => removeObstacle(o.id)}>Delete</button>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>No obstacles yet.</div>
      )}

      <h2 style={{ marginTop: 14 }}>Properties</h2>
      {selectedObstacle ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <Vec3Row
            label="Pos"
            value={selectedObstacle.position}
            step={0.01}
            onChange={(next) => updateObstaclePose(selectedObstacle.id, { position: next })}
          />
          <Vec3Row
            label="Rot°"
            value={[
              radToDeg(selectedObstacle.rotation[0]),
              radToDeg(selectedObstacle.rotation[1]),
              radToDeg(selectedObstacle.rotation[2]),
            ]}
            step={1}
            onChange={(next) =>
              updateObstaclePose(selectedObstacle.id, {
                rotation: [degToRad(next[0]), degToRad(next[1]), degToRad(next[2])],
              })
            }
          />
          <Vec3Row
            label="Scale"
            value={selectedObstacle.size}
            step={0.01}
            onChange={(next) => updateObstacleSize(selectedObstacle.id, next)}
          />
        </div>
      ) : (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
          Select an obstacle to edit its properties.
        </div>
      )}
    </div>
  );
};

