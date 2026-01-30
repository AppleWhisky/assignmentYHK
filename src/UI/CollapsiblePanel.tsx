import { useState } from 'react';
import type { ReactNode } from 'react';

export const CollapsiblePanel = (props: {
  title: string;
  children: ReactNode;
  dockSide?: 'left' | 'right';
  tone?: 'none' | 'warning' | 'collision';
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const dockSide = props.dockSide ?? 'right';
  const tone = props.tone ?? 'none';

  const arrow =
    dockSide === 'right'
      ? collapsed
        ? '◀'
        : '▶'
      : // Left panel is mirrored: handle is on the right edge.
        collapsed
        ? '▶'
        : '◀';

  return (
    <div
      className={[
        'panelShell',
        collapsed ? 'isCollapsed' : null,
        dockSide === 'left' ? 'isDockLeft' : 'isDockRight',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        type="button"
        className="panelDockToggle"
        aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
        onClick={() => setCollapsed((v) => !v)}
      >
        {arrow}
      </button>
      <div
        className={[
          'panelFrame',
          tone === 'warning' ? 'isWarning' : null,
          tone === 'collision' ? 'isCollision' : null,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="panelHeader">
          <div className="panelTitle">{props.title}</div>
        </div>
        <div className="panelBody">{props.children}</div>
      </div>
    </div>
  );
};
