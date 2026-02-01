import { radToDeg, degToRad, clamp } from '@/utils/angles';
import { useSimStore } from '@/store/useSimStore';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

const SNAP_DEGS = [-180, -135, -90, -45, 0, 45, 90, 135, 180] as const;

const HoldButton = (props: { label: string; onStep: () => void; children: ReactNode; disabled?: boolean }) => {
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
      className="nudgeBtn"
      aria-label={props.label}
      disabled={props.disabled}
      onPointerDown={(e) => {
        if (props.disabled) return;
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
  const savedAnimations = useSimStore((s) => s.savedAnimations);
  const selectedAnimationId = useSimStore((s) => s.selectedAnimationId);
  const selectAnimation = useSimStore((s) => s.selectAnimation);
  const presetAnimationsLoading = useSimStore((s) => s.presetAnimationsLoading);
  const presetAnimationsError = useSimStore((s) => s.presetAnimationsError);
  const loadPresetAnimations = useSimStore((s) => s.loadPresetAnimations);
  const playback = useSimStore((s) => s.playback);
  const startPlayback = useSimStore((s) => s.startPlayback);
  const stopPlayback = useSimStore((s) => s.stopPlayback);
  const playbackOptions = useSimStore((s) => s.playbackOptions);
  const setPlaybackOptions = useSimStore((s) => s.setPlaybackOptions);
  const setReportModalOpen = useSimStore((s) => s.setReportModalOpen);
  const [simError, setSimError] = useState<string | null>(null);
  const isPlaying = playback.status === 'playing';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Status is shown in the TopBar HUD; keep this panel focused on controls. */}

      <section>
        <h2>Simulation</h2>
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--panel-border)',
            padding: 10,
            borderRadius: 12,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
            <select
              className="animSelect"
              value={selectedAnimationId ?? ''}
              onChange={(e) => selectAnimation(e.target.value || null)}
              disabled={!savedAnimations.length}
              title={!savedAnimations.length ? 'Add files to public/animations and update public/animations/index.json' : undefined}
            >
              <option value="">
                {presetAnimationsLoading
                  ? '(loading animations...)'
                  : savedAnimations.length
                    ? '(select animation)'
                    : '(no animations found)'}
              </option>
              {savedAnimations
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} {a.loopMode === 'pingpong' ? '↔' : ''}
                  </option>
                ))}
            </select>

            {playback.status === 'playing' ? (
              <button
                onClick={() => {
                  stopPlayback('user');
                  setReportModalOpen(true);
                }}
                style={{ fontSize: 11, borderColor: 'rgba(239, 68, 68, 0.45)' }}
              >
                Stop
              </button>
            ) : (
              <button
                onClick={() => {
                  if (!selectedAnimationId) return;
                  const r = startPlayback(selectedAnimationId);
                  if (!r.ok) setSimError(r.error);
                  else setSimError(null);
                }}
                style={{ fontSize: 11 }}
                disabled={!selectedAnimationId}
                title={!selectedAnimationId ? 'Select a saved animation first' : undefined}
              >
                Simulation Start
              </button>
            )}
          </div>

          <label
            className="topHudToggle"
            style={{ marginTop: 10, display: 'inline-flex' }}
            title="If enabled, playback stops immediately when any collision occurs."
          >
            <input
              type="checkbox"
              checked={playbackOptions.stopOnCollision}
              onChange={(e) => setPlaybackOptions({ stopOnCollision: e.target.checked })}
              disabled={isPlaying}
            />
            Stop on collision
          </label>

          {simError ? (
            <div style={{ marginTop: 8, fontSize: 12, color: '#ff9a3d' }}>Cannot play: {simError}</div>
          ) : null}
          {isPlaying ? (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
              Playback running: Jog locked.
            </div>
          ) : null}
          {presetAnimationsError ? (
            <div style={{ marginTop: 8, fontSize: 12, color: '#ff9a3d' }}>
              Failed to load presets: {presetAnimationsError}{' '}
              <button
                className="topHudBtn"
                style={{ marginLeft: 8, padding: '4px 8px', fontSize: 11 }}
                onClick={() => void loadPresetAnimations()}
              >
                Retry
              </button>
            </div>
          ) : null}

          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted)' }}>
            {selectedAnimationId
              ? (() => {
                  const a = savedAnimations.find((x) => x.id === selectedAnimationId);
                  if (!a) return 'Selected animation not found.';
                  let maxLayer = 0;
                  for (const n of a.nodes) {
                    const l = Math.floor(n.data.layer);
                    if (Number.isFinite(l) && l > 0) maxLayer = Math.max(maxLayer, l);
                  }
                  return `Loop: ${a.loopMode === 'pingpong' ? 'Ping-pong' : 'None'} · Layer duration: 1.0s · Total: ${maxLayer}s`;
                })()
              : 'Tip: Put animations in public/animations + update public/animations/index.json.'}
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button
          onClick={() => setSelected({ kind: 'robot' })}
          style={{ fontSize: 11 }}
          disabled={isPlaying}
          title={isPlaying ? 'Jog controls are locked during playback' : undefined}
        >
          Move robot
        </button>
        <button
          onClick={() => resetRobotPose()}
          style={{ fontSize: 11 }}
          disabled={isPlaying}
          title={isPlaying ? 'Jog controls are locked during playback' : undefined}
        >
          Reset pose
        </button>
      </div>

      <section>
        <h2>Robot Base</h2>
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--panel-border)',
            padding: 10,
            borderRadius: 12,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <button
              type="button"
              style={{
                padding: 0,
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                textAlign: 'left',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
              onClick={() => {
                if (isPlaying) return;
                setJointGizmoActive(false);
                setSelected({ kind: 'robot' });
              }}
              disabled={isPlaying}
              title={isPlaying ? 'Jog controls are locked during playback' : undefined}
            >
              Base Yaw <span style={{ color: 'var(--muted)' }}>(Y)</span>
            </button>
            <span style={{ fontFamily: 'ui-monospace, monospace', color: '#60a5fa', fontSize: 12 }}>
              {radToDeg(robotYawRad).toFixed(1)}°
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <HoldButton
              label="Nudge Base Yaw -"
              disabled={isPlaying}
              onStep={() => {
                setJointGizmoActive(false);
                setSelected({ kind: 'robot' });
                nudgeRobotYaw(-1);
              }}
            >
              -
            </HoldButton>
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
              disabled={isPlaying}
              title={isPlaying ? 'Jog controls are locked during playback' : undefined}
              style={{ flex: 1, margin: 0 }}
            />
            <HoldButton
              label="Nudge Base Yaw +"
              disabled={isPlaying}
              onStep={() => {
                setJointGizmoActive(false);
                setSelected({ kind: 'robot' });
                nudgeRobotYaw(1);
              }}
            >
              +
            </HoldButton>
          </div>
          <datalist id="zero-tick-base-yaw">
            {SNAP_DEGS.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </div>
      </section>

      <section>
        <h2>Joints</h2>
        {joints.length === 0 ? (
          <div style={{ marginTop: 4, fontSize: 12, color: 'var(--muted)' }}>Loading joints from GLB...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {joints.map((j) => {
              const isSelected = selected?.kind === 'joint' && selected.name === j.name;
              const deg = radToDeg(j.angleRad);
              const minDeg = typeof j.minRad === 'number' ? radToDeg(j.minRad) : -180;
              const maxDeg = typeof j.maxRad === 'number' ? radToDeg(j.maxRad) : 180;
              const clampedDeg = clamp(deg, minDeg, maxDeg);

              return (
                <div
                  key={j.name}
                  style={{
                    background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isSelected ? 'rgba(59, 130, 246, 0.45)' : 'var(--panel-border)'}`,
                    padding: 10,
                    borderRadius: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                    <button
                      type="button"
                      style={{
                        padding: 0,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text)',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        if (isPlaying) return;
                        setSelected({ kind: 'joint', name: j.name });
                        setJointGizmoActive(true);
                      }}
                      disabled={isPlaying}
                      title={isPlaying ? 'Jog controls are locked during playback' : undefined}
                    >
                      {j.label} <span style={{ color: 'var(--muted)' }}>({j.axis.toUpperCase()})</span>
                    </button>
                    <span style={{ fontFamily: 'ui-monospace, monospace', color: '#60a5fa', fontSize: 12 }}>
                      {clampedDeg.toFixed(1)}°
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                    <HoldButton
                      label={`Nudge ${j.label} -`}
                      disabled={isPlaying}
                      onStep={() => {
                        setSelected({ kind: 'joint', name: j.name });
                        setJointGizmoActive(true);
                        nudgeJoint(j.name, -1);
                      }}
                    >
                      -
                    </HoldButton>
                    <input
                      className="slider"
                      type="range"
                      min={minDeg}
                      max={maxDeg}
                      step={0.5}
                      list={`zero-tick-${j.name}`}
                      value={clampedDeg}
                      onChange={(e) => {
                        setSelected({ kind: 'joint', name: j.name });
                        setJointGizmoActive(true);
                        setJointAngle(j.name, degToRad(Number(e.target.value)));
                      }}
                      disabled={isPlaying}
                      title={isPlaying ? 'Jog controls are locked during playback' : undefined}
                      style={{ flex: 1, margin: 0 }}
                    />
                    <HoldButton
                      label={`Nudge ${j.label} +`}
                      disabled={isPlaying}
                      onStep={() => {
                        setSelected({ kind: 'joint', name: j.name });
                        setJointGizmoActive(true);
                        nudgeJoint(j.name, 1);
                      }}
                    >
                      +
                    </HoldButton>
                  </div>

                  <datalist id={`zero-tick-${j.name}`}>
                    {SNAP_DEGS.filter((v) => v >= minDeg && v <= maxDeg).map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
