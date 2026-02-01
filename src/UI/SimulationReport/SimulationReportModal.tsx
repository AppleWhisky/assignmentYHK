import { useMemo } from 'react';
import { useSimStore } from '@/store/useSimStore';

function fmtTime(t: number) {
  if (!Number.isFinite(t)) return '0.00s';
  return `${t.toFixed(2)}s`;
}

export const SimulationReportModal = () => {
  const open = useSimStore((s) => s.reportModalOpen);
  const setOpen = useSimStore((s) => s.setReportModalOpen);
  const report = useSimStore((s) => s.playbackReport);
  const clear = useSimStore((s) => s.clearPlaybackReport);

  const text = useMemo(() => {
    if (!report.length) return '(no collisions recorded)';
    const sorted = report.slice().sort((a, b) => a.tSec - b.tSec || a.layer - b.layer);
    return sorted
      .map((e) => `[t=${fmtTime(e.tSec)}, Layer ${e.layer}] ${e.a} ↔ ${e.b} (${e.kind})`)
      .join('\n');
  }, [report]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 60,
        // Allow interacting with the 3D scene while the report is open.
        // Only the report panel itself should capture pointer events.
        pointerEvents: 'none',
      }}
    >
      {/* Visual dimmer only; do not block interactions */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.08)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 18,
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 18,
          background: 'rgba(10, 13, 20, 0.40)',
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.60)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            borderBottom: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(0, 0, 0, 0.22)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
            Simulation report
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="topHudBtn" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>

        <div style={{ padding: 14, overflow: 'auto' }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            Collisions are recorded when they start (logged again if they stop and re-occur).
          </div>
          <textarea
            readOnly
            value={text}
            style={{
              width: '100%',
              height: '100%',
              minHeight: 260,
              background: 'rgba(0,0,0,0.18)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 12,
              padding: 12,
              color: 'rgba(226, 232, 240, 0.88)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: 12,
              lineHeight: 1.45,
              whiteSpace: 'pre',
            }}
          />
        </div>

        <div
          style={{
            padding: 14,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 10,
            borderTop: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(0, 0, 0, 0.22)',
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="topHudBtn"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(text);
                } catch {
                  // ignore
                }
              }}
              title="Copy report text"
            >
              Copy
            </button>
            <button
              className="topHudBtn"
              onClick={() => clear()}
              title="Clear report"
              style={{ borderColor: 'rgba(239, 68, 68, 0.35)' }}
            >
              Clear
            </button>
          </div>
          <button className="topHudBtn" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

