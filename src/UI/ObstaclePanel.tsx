import { degToRad, radToDeg } from '@/utils/angles';
import { useSimStore } from '@/store/useSimStore';
import { useEffect, useRef, useState } from 'react';

type AxisKey = 'X' | 'Y' | 'Z';
const AXIS_BADGE_BG: Record<AxisKey, string> = {
  X: 'var(--axis-x)',
  Y: 'var(--axis-y)',
  Z: 'var(--axis-z)',
};

const AxisBadge = (props: { axis: AxisKey }) => {
  const bg = AXIS_BADGE_BG[props.axis];
  return (
    <div
      style={{
        background: bg,
        color: '#0b1020',
        fontSize: 9,
        fontWeight: 900,
        padding: '1px 4px',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 16,
        height: 16,
        flex: '0 0 auto',
      }}
    >
      {props.axis}
    </div>
  );
};

const Vec3Row = (props: {
  label: string;
  value: [number, number, number];
  step?: number;
  onChange: (next: [number, number, number]) => void;
}) => {
  const step = props.step ?? 0.01;
  const [x, y, z] = props.value;

  const fmt = (n: number) => (Number.isFinite(n) ? String(Number(n.toFixed(3))) : '0');
  const [text, setText] = useState<{ x: string; y: string; z: string }>(() => ({
    x: fmt(x),
    y: fmt(y),
    z: fmt(z),
  }));
  const activeRef = useRef<'x' | 'y' | 'z' | null>(null);

  useEffect(() => {
    setText((t) => ({
      x: activeRef.current === 'x' ? t.x : fmt(x),
      y: activeRef.current === 'y' ? t.y : fmt(y),
      z: activeRef.current === 'z' ? t.z : fmt(z),
    }));
  }, [x, y, z]);

  const allow = (s: string) => /^-?\d*(?:\.\d*)?$/.test(s);
  const commit = (axis: 'x' | 'y' | 'z') => {
    const raw = text[axis].trim();
    activeRef.current = null;
    const prev = axis === 'x' ? x : axis === 'y' ? y : z;
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') {
      setText((t) => ({ ...t, [axis]: fmt(prev) }));
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setText((t) => ({ ...t, [axis]: fmt(prev) }));
      return;
    }
    const next: [number, number, number] = [
      axis === 'x' ? n : x,
      axis === 'y' ? n : y,
      axis === 'z' ? n : z,
    ];
    props.onChange(next);
    setText((t) => ({ ...t, [axis]: fmt(n) }));
  };
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '44px 1fr 1fr 1fr',
        gap: 8,
        alignItems: 'center',
        marginBottom: 4,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {props.label}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(0,0,0,0.22)',
          padding: '4px 6px',
          borderRadius: 10,
          border: '1px solid var(--panel-border)',
        }}
      >
        <AxisBadge axis="X" />
        <input
          type="text"
          inputMode="decimal"
          value={text.x}
          step={step}
          onFocus={(e) => {
            activeRef.current = 'x';
            // UX: allow quickly typing "-5" without manual clearing
            (e.currentTarget as HTMLInputElement).select();
          }}
          onChange={(e) => {
            const v = e.target.value;
            if (!allow(v)) return;
            setText((t) => ({ ...t, x: v }));
          }}
          onBlur={() => commit('x')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setText((t) => ({ ...t, x: fmt(x) }));
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            (e.currentTarget as HTMLInputElement).blur();
          }}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: 0,
            textAlign: 'right',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(0,0,0,0.22)',
          padding: '4px 6px',
          borderRadius: 10,
          border: '1px solid var(--panel-border)',
        }}
      >
        <AxisBadge axis="Y" />
        <input
          type="text"
          inputMode="decimal"
          value={text.y}
          step={step}
          onFocus={(e) => {
            activeRef.current = 'y';
            (e.currentTarget as HTMLInputElement).select();
          }}
          onChange={(e) => {
            const v = e.target.value;
            if (!allow(v)) return;
            setText((t) => ({ ...t, y: v }));
          }}
          onBlur={() => commit('y')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setText((t) => ({ ...t, y: fmt(y) }));
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            (e.currentTarget as HTMLInputElement).blur();
          }}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: 0,
            textAlign: 'right',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(0,0,0,0.22)',
          padding: '4px 6px',
          borderRadius: 10,
          border: '1px solid var(--panel-border)',
        }}
      >
        <AxisBadge axis="Z" />
        <input
          type="text"
          inputMode="decimal"
          value={text.z}
          step={step}
          onFocus={(e) => {
            activeRef.current = 'z';
            (e.currentTarget as HTMLInputElement).select();
          }}
          onChange={(e) => {
            const v = e.target.value;
            if (!allow(v)) return;
            setText((t) => ({ ...t, z: v }));
          }}
          onBlur={() => commit('z')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setText((t) => ({ ...t, z: fmt(z) }));
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            (e.currentTarget as HTMLInputElement).blur();
          }}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            padding: 0,
            textAlign: 'right',
          }}
        />
      </div>
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
            onChange={(next) =>
              updateObstacleSize(selectedObstacle.id, [
                Math.max(0, next[0]),
                Math.max(0, next[1]),
                Math.max(0, next[2]),
              ])
            }
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

