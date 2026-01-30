import { useState } from 'react';
import type { ReactNode } from 'react';

export const CollapsiblePanel = (props: { title: string; children: ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={collapsed ? 'panelShell isCollapsed' : 'panelShell'}>
      <button
        type="button"
        className="panelDockToggle"
        aria-label={collapsed ? 'Expand panel' : 'Collapse panel'}
        onClick={() => setCollapsed((v) => !v)}
      >
        {collapsed ? '◀' : '▶'}
      </button>
      <div className="panelFrame">
        <div className="panelHeader">
          <div className="panelTitle">{props.title}</div>
        </div>
        <div className="panelBody">{props.children}</div>
      </div>
    </div>
  );
};
