import { radToDeg, degToRad, clamp } from '@/utils/angles';
import { useSimStore } from '@/store/useSimStore';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

const SNAP_DEGS = [-180, -135, -90, -45, 0, 45, 90, 135, 180] as const;

const HoldButton = (props: { label: string; onStep: () => void; children: ReactNode }) => {
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  };

  useEffect(() => clearTimers, []);

  return (
    <button
      type="button"
      style={{ padding: '8px 10px' }}
      aria-label={props.label}
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.currentTarget as HTMLButtonElement).setPointerCapture?.(e.pointerId);
        props.onStep(); // immediate
        clearTimers();
        timeoutRef.current = window.setTimeout(() => {
          intervalRef.current = window.setInterval(() => {
            props.onStep();
          }, 60);
        }, 250);
      }}
      onPointerUp={() => clearTimers()}
      onPointerCancel={() => clearTimers()}
      onPointerLeave={() => clearTimers()}
    >
      {props.children}
    </button>
  );
};

export const JogPanel = () => {
  const joints = useSimStore((s) => s.joints);
  const selected = useSimStore((s) => s.selected);
  const setSelected = useSimStore((s) => s.setSelected);
  const setJointGizmoActive = useSimStore((s) => s.setJointGizmoActive);
  const setJointAngle = useSimStore((s) => s.setJointAngle);
  const nudgeJoint = useSimStore((s) => s.nudgeJoint);
  const resetRobotPose = useSimStore((s) => s.resetRobotPose);
  const robotYawRad = useSimStore((s) => s.robotYawRad);
  const setRobotYawRad = useSimStore((s) => s.setRobotYawRad);
  const nudgeRobotYaw = useSimStore((s) => s.nudgeRobotYaw);
  const collision = useSimStore((s) => s.collision);
  const showCollisionBoxes = useSimStore((s) => s.showCollisionBoxes);
  const setShowCollisionBoxes = useSimStore((s) => s.setShowCollisionBoxes);

  return (
    <div>
      <div className="badge" style={{ marginTop: 0 }}>
        <span className={collision.severity === 'collision' ? 'dot isColliding' : 'dot'} />
        <span>
          {collision.severity === 'collision'
            ? 'Collision'
            : collision.severity === 'warning'
              ? 'Warning'
              : 'OK'}
        </span>
      </div>

      <label
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: 'var(--muted)',
          userSelect: 'none',
        }}
      >
        <input
          type="checkbox"
          checked={showCollisionBoxes}
          onChange={(e) => setShowCollisionBoxes(e.target.checked)}
        />
        Show collision bounding boxes
      </label>

      <div className="btnRow" style={{ marginTop: 10 }}>
        <button onClick={() => setSelected({ kind: 'robot' })}>Move robot</button>
        <button onClick={() => resetRobotPose()}>Reset robot</button>
      </div>

      <h2 style={{ marginTop: 12 }}>Robot Base</h2>
      <div style={{ marginTop: 10 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 34px 34px 64px',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'baseline',
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              padding: '8px 10px',
              fontSize: 12,
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
            onClick={() => {
              setJointGizmoActive(false);
              setSelected({ kind: 'robot' });
            }}
          >
            <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Base Rotation
            </span>
            <span style={{ color: 'var(--muted)' }}>(Y)</span>
          </button>
          <HoldButton
            label="Nudge Base Rotation -"
            onStep={() => {
              setJointGizmoActive(false);
              setSelected({ kind: 'robot' });
              nudgeRobotYaw(-1);
            }}
          >
            -
          </HoldButton>
          <HoldButton
            label="Nudge Base Rotation +"
            onStep={() => {
              setJointGizmoActive(false);
              setSelected({ kind: 'robot' });
              nudgeRobotYaw(1);
            }}
          >
            +
          </HoldButton>
          <output
            style={{
              justifySelf: 'end',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              minWidth: 64,
            }}
          >
            {radToDeg(robotYawRad).toFixed(1)}°
          </output>
        </div>
        <input
          className="slider"
          type="range"
          min={-180}
          max={180}
          step={0.5}
          list="zero-tick-base-yaw"
          value={clamp(radToDeg(robotYawRad), -180, 180)}
          onChange={(e) => {
            setJointGizmoActive(false);
            setSelected({ kind: 'robot' });
            setRobotYawRad(degToRad(Number(e.target.value)));
          }}
        />
        <datalist id="zero-tick-base-yaw">
          {SNAP_DEGS.map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </div>

      {joints.length === 0 ? (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
          Loading joints from GLB...
        </div>
      ) : null}

      <h2 style={{ marginTop: 12 }}>Joints</h2>
      {joints.map((j) => {
        const isSelected = selected?.kind === 'joint' && selected.name === j.name;
        const deg = radToDeg(j.angleRad);
        const minDeg = typeof j.minRad === 'number' ? radToDeg(j.minRad) : -180;
        const maxDeg = typeof j.maxRad === 'number' ? radToDeg(j.maxRad) : 180;
        return (
          <div key={j.name} style={{ marginTop: 10 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 34px 34px 64px',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'baseline',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  fontSize: 12,
                  lineHeight: 1.1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
                onClick={() => {
                  setSelected({ kind: 'joint', name: j.name });
                  setJointGizmoActive(true);
                }}
              >
                <span
                  style={{
                    color: isSelected ? 'rgba(45,108,255,1)' : undefined,
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {j.label}
                </span>
                <span style={{ color: 'var(--muted)' }}>({j.axis.toUpperCase()})</span>
              </button>
              <HoldButton
                label={`Nudge ${j.label} -`}
                onStep={() => {
                  setSelected({ kind: 'joint', name: j.name });
                  setJointGizmoActive(true);
                  nudgeJoint(j.name, -1);
                }}
              >
                -
              </HoldButton>
              <HoldButton
                label={`Nudge ${j.label} +`}
                onStep={() => {
                  setSelected({ kind: 'joint', name: j.name });
                  setJointGizmoActive(true);
                  nudgeJoint(j.name, 1);
                }}
              >
                +
              </HoldButton>
              <output
                style={{
                  justifySelf: 'end',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 64,
                }}
              >
                {deg.toFixed(1)}°
              </output>
            </div>
            <input
              className="slider"
              type="range"
              min={minDeg}
              max={maxDeg}
              step={0.5}
              list={`zero-tick-${j.name}`}
              value={clamp(deg, minDeg, maxDeg)}
              onChange={(e) => {
                setSelected({ kind: 'joint', name: j.name });
                setJointGizmoActive(true);
                setJointAngle(j.name, degToRad(Number(e.target.value)));
              }}
            />
            <datalist id={`zero-tick-${j.name}`}>
              {SNAP_DEGS.filter((v) => v >= minDeg && v <= maxDeg).map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>
        );
      })}
    </div>
  );
};
