import { useMemo } from 'react';
import { useSimStore } from '@/store/useSimStore';

function fmtTime(t: number) {
  if (!Number.isFinite(t)) return '0.00s';
  return `${t.toFixed(2)}s`;
}

export const BottomBar = () => {
  const report = useSimStore((s) => s.playbackReport);
  const clear = useSimStore((s) => s.clearPlaybackReport);
  const setReportModalOpen = useSimStore((s) => s.setReportModalOpen);

  const last = report.length ? report[report.length - 1] : null;
  const text = useMemo(() => {
    if (!last) return '';
    return `Latest: [t=${fmtTime(last.tSec)}, L${last.layer}] ${last.a} ↔ ${last.b} (${last.kind})`;
  }, [last]);

  // Hide BottomBar unless we have at least 1 collision event.
  if (!last) return null;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.82)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
        title={text}
      >
        {text}
      </div>
      <div style={{ display: 'flex', gap: 8, flex: '0 0 auto' }}>
        <button className="topHudBtn" onClick={() => setReportModalOpen(true)} style={{ fontSize: 11 }}>
          Full report
        </button>
        <button
          className="topHudBtn"
          onClick={() => clear()}
          style={{ fontSize: 11, borderColor: 'rgba(239, 68, 68, 0.35)' }}
          title="Clear report"
        >
          Clear
        </button>
      </div>
    </div>
  );
};
