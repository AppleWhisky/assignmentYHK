import { useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, { Background, Controls, MiniMap, type Node, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';

import { useSimStore } from '@/store/useSimStore';
import type { AnimNode, AnimNodeData, AnimTarget } from '@/store/useSimStore';

type AnimNodeDataView = AnimNodeData & { __highlighted?: boolean; __autoStartDeg?: number };

function layerHue(layer: number) {
  // Golden-angle hue distribution: visually distinct as layer count grows.
  return ((layer * 137.508) % 360 + 360) % 360;
}

function clampNumber(n: number) {
  return Number.isFinite(n) ? n : 0;
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function computeAutoStartDegByNodeId(nodes: AnimNode[]) {
  const ordered = nodes
    .slice()
    .sort((a, b) => (Math.floor(a.data.layer) - Math.floor(b.data.layer)) || a.id.localeCompare(b.id));
  const lastEndByTarget = new Map<string, number>();
  const startByNodeId = new Map<string, number>();
  const keyForTarget = (t: AnimTarget) => (t.kind === 'baseYaw' ? 'baseYaw' : `joint:${t.name}`);
  for (const n of ordered) {
    const key = keyForTarget(n.data.target);
    const start = lastEndByTarget.get(key) ?? 0;
    startByNodeId.set(n.id, start);
    lastEndByTarget.set(key, n.data.endDeg);
  }
  return startByNodeId;
}

function toFlowNodes(nodes: AnimNode[], highlightLayer: number | null): Node<AnimNodeDataView>[] {
  const autoStartById = computeAutoStartDegByNodeId(nodes);
  return nodes.map((n) => ({
    id: n.id,
    type: 'animStep',
    position: n.position,
    data: {
      ...n.data,
      __highlighted: highlightLayer ? Math.floor(n.data.layer) === highlightLayer : false,
      __autoStartDeg: autoStartById.get(n.id) ?? 0,
    },
  }));
}

export const AnimationEditorOverlay = () => {
  const open = useSimStore((s) => s.animationEditorOpen);
  const setOpen = useSimStore((s) => s.setAnimationEditorOpen);

  const draft = useSimStore((s) => s.animationDraft);
  const newDraft = useSimStore((s) => s.newAnimationDraft);
  const importAnimationJsonToDraft = useSimStore((s) => s.importAnimationJsonToDraft);
  const setName = useSimStore((s) => s.setAnimationDraftName);
  const setLoopMode = useSimStore((s) => s.setAnimationDraftLoopMode);
  const addNode = useSimStore((s) => s.addAnimationDraftNode);
  const removeNode = useSimStore((s) => s.removeAnimationDraftNode);
  const updateNodePos = useSimStore((s) => s.updateAnimationDraftNodePosition);
  const autoArrange = useSimStore((s) => s.autoArrangeAnimationDraftByLayer);
  const saveDraftToLibrary = useSimStore((s) => s.saveDraftToLibrary);

  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const draftIdRef = useRef<string | null>(null);
  const [highlightLayer, setHighlightLayer] = useState<number | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<AnimNodeDataView>(toFlowNodes(draft.nodes, null));

  useEffect(() => {
    // When store draft updates (e.g. editing node data), keep existing selection state
    // to avoid “select then immediately unselect” in controlled ReactFlow mode.
    if (draftIdRef.current !== draft.id) {
      draftIdRef.current = draft.id;
      setSelectedNodeId(null);
      setHighlightLayer(null);
    }

    setNodes((prev) => {
      const prevSelected = new Map(prev.map((n) => [n.id, Boolean(n.selected)] as const));
      return toFlowNodes(draft.nodes, highlightLayer).map((n) => ({
        ...n,
        selected: prevSelected.get(n.id) ?? false,
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id, draft.nodes, highlightLayer]);

  const selectedNode = selectedNodeId ? draft.nodes.find((n) => n.id === selectedNodeId) ?? null : null;

  const layerSummary = useMemo(() => {
    let maxLayer = 0;
    for (const n of draft.nodes) {
      const l = Math.floor(n.data.layer);
      if (Number.isFinite(l) && l > 0) maxLayer = Math.max(maxLayer, l);
    }
    const durationSec = maxLayer;
    return { maxLayer, durationSec };
  }, [draft.nodes]);

  const joints = useSimStore((s) => s.joints);
  const jointBadgeByName = useMemo(() => {
    // Prefer J# prefix if present in label, otherwise fallback to name.
    const m = new Map<string, string>();
    for (const j of joints) {
      const m0 = /^J\d+/.exec(j.label);
      m.set(j.name, m0?.[0] ?? j.label ?? j.name);
    }
    return m;
  }, [joints]);

  const timelineLayers = useMemo(() => {
    const maxLayer = layerSummary.maxLayer;
    const byLayer = new Map<number, AnimNode[]>();
    for (let l = 1; l <= maxLayer; l++) byLayer.set(l, []);
    for (const n of draft.nodes) {
      const l = Math.floor(n.data.layer);
      if (!Number.isFinite(l) || l <= 0) continue;
      if (!byLayer.has(l)) byLayer.set(l, []);
      byLayer.get(l)!.push(n);
    }
    return { maxLayer, byLayer };
  }, [draft.nodes, layerSummary.maxLayer]);

  const targetChip = (t: AnimTarget) => {
    if (t.kind === 'baseYaw') return 'Yaw';
    return jointBadgeByName.get(t.name) ?? 'Joint';
  };

  const nodeTypes = useMemo(() => ({ animStep: AnimStepNode }), []);

  if (!open) return null;

  return (
    <div className="animOverlay" onWheel={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onPointerMove={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="animOverlayBackdrop"
        aria-label="Close animation editor"
        onClick={() => setOpen(false)}
        style={{ border: 'none', padding: 0 }}
      />
      <div className="animEditor">
        <div className="animEditorHeader">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
            <div className="animEditorTitle">Animation Timeline</div>
            <div className="animEditorSubtle" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {draft.nodes.length
                ? `Boxes: ${draft.nodes.length} · Max layer: ${layerSummary.maxLayer} · Duration: ${layerSummary.durationSec}s`
                : 'No boxes yet'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="topHudBtn" onClick={() => newDraft()}>New</button>
            <button className="topHudBtn" onClick={() => setOpen(false)}>Close</button>
          </div>
        </div>

        <div className="animEditorToolbar">
          <div className="animToolbarGroup">
            <div className="animFieldLabel">Name</div>
            <input className="animTextInput" value={draft.name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="animToolbarGroup">
            <div className="animFieldLabel">Loop</div>
            <select className="animSelect" value={draft.loopMode} onChange={(e) => setLoopMode(e.target.value as 'none' | 'pingpong')}>
              <option value="none">None</option>
              <option value="pingpong">Ping-pong</option>
            </select>
          </div>

          <button onClick={() => { addNode(); setMsg(null); }}>Add box</button>
          <button
            className="topHudBtn"
            style={{ padding: '6px 10px', fontSize: 11 }}
            onClick={() => {
              autoArrange();
              setMsg({ kind: 'ok', text: 'Auto arranged by layer.' });
            }}
            title="Arrange boxes into an Excel-like grid: columns=layer, rows=boxes"
          >
            Auto Arrange
          </button>
          <div style={{ flex: 1 }} />

          <div className="animToolbarGroup">
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const f = e.currentTarget.files?.[0] ?? null;
                // allow re-importing same file
                e.currentTarget.value = '';
                if (!f) return;
                try {
                  const text = await f.text();
                  const json = JSON.parse(text) as unknown;
                  const r = importAnimationJsonToDraft(json);
                  if (!r.ok) {
                    setMsg({ kind: 'error', text: r.error });
                    return;
                  }
                  setMsg({ kind: 'ok', text: 'Imported into draft. Click Save to add to library.' });
                } catch (err) {
                  const m = err instanceof Error ? err.message : 'Failed to import JSON.';
                  setMsg({ kind: 'error', text: m });
                }
              }}
            />
            <button
              className="topHudBtn"
              onClick={() => {
                setMsg(null);
                importRef.current?.click();
              }}
            >
              Import JSON
            </button>
            <button className="topHudBtn" onClick={() => { setMsg(null); const r = saveDraftToLibrary(); if (!r.ok) setMsg({ kind: 'error', text: r.error }); else setMsg({ kind: 'ok', text: 'Saved.' }); }}>Save</button>
            <button
              className="topHudBtn"
              onClick={() => {
                setMsg(null);
                const r = saveDraftToLibrary();
                if (!r.ok) { setMsg({ kind: 'error', text: r.error }); return; }
                const safeName = (draft.name || 'animation').replace(/[^\w-]+/g, '_').slice(0, 64);
                downloadJson(`robot-animation-${safeName}.json`, useSimStore.getState().savedAnimations.find((a) => a.id === r.id));
                setMsg({ kind: 'ok', text: 'Exported JSON.' });
              }}
            >
              Export JSON
            </button>
          </div>
        </div>

        <div className="animMsgSlot">
          {msg ? <div className={['animMsg', msg.kind === 'error' ? 'isError' : 'isOk'].join(' ')}>{msg.text}</div> : null}
        </div>

        <div className="animGraphBody">
          <div className="animGraphCanvas">
            <ReactFlow
              nodes={nodes}
              edges={[]}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onNodeDragStop={(_, n) => updateNodePos(n.id, n.position)}
              onNodesDelete={(deleted) => { for (const n of deleted) removeNode(n.id); }}
              onSelectionChange={(sel) => { const nodeId = sel.nodes?.[0]?.id ?? null; setSelectedNodeId(nodeId); }}
              fitView
              nodesConnectable={false}
              deleteKeyCode={['Backspace', 'Delete']}
            >
              <Background />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </div>

          <div className="animInspector">
            <div className="animInspectorTitle">Inspector</div>

            {/* Timeline mini-map (always visible) */}
            {timelineLayers.maxLayer > 0 ? (
              <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
                <div className="animTimelineStrip" role="list" aria-label="Animation timeline layers">
                  {Array.from({ length: timelineLayers.maxLayer }, (_, i) => {
                    const layer = i + 1;
                    const nodesInLayer = timelineLayers.byLayer.get(layer) ?? [];
                    const isEmpty = nodesInLayer.length === 0;
                    const isActive = highlightLayer === layer;

                    // Unique targets in this layer (so duplicates don't spam chips)
                    const chips = Array.from(
                      new Set(nodesInLayer.map((n) => targetChip(n.data.target))),
                    );
                    const shown = chips.slice(0, 3);
                    const extra = chips.length - shown.length;

                    return (
                      <button
                        key={layer}
                        type="button"
                        className={[
                          'animTimelineCell',
                          isEmpty ? 'isEmpty' : null,
                          isActive ? 'isActive' : null,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => setHighlightLayer((prev) => (prev === layer ? null : layer))}
                        title={isEmpty ? `Layer ${layer}: Rest` : `Layer ${layer}: ${nodesInLayer.length} box(es)`}
                        disabled={isEmpty}
                      >
                        <span className="animTimelineLayerNum">{layer}</span>
                        <span className="animTimelineTime">{layer - 1}–{layer}s</span>
                        <span className="animTimelineChips">
                          {isEmpty ? (
                            <span className="animTimelineChip isRest">rest</span>
                          ) : (
                            <>
                              {shown.map((c) => (
                                <span key={c} className="animTimelineChip">
                                  {c}
                                </span>
                              ))}
                              {extra > 0 ? <span className="animTimelineChip">+{extra}</span> : null}
                            </>
                          )}
                        </span>
                        <span className="animTimelineCount">{nodesInLayer.length}</span>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    Click a layer to highlight its boxes.
                  </div>
                  {highlightLayer ? (
                    <button
                      className="topHudBtn"
                      style={{ padding: '4px 8px', fontSize: 11 }}
                      onClick={() => setHighlightLayer(null)}
                    >
                      Clear highlight
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {selectedNode ? (
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Box <span style={{ fontFamily: 'ui-monospace, monospace', color: '#60a5fa' }}>{selectedNode.id}</span>
                </div>
                <button className="topHudBtn" onClick={() => removeNode(selectedNode.id)} style={{ borderColor: 'rgba(239, 68, 68, 0.45)' }}>
                  Delete Box
                </button>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Layer meaning: layer 1 plays at 0–1s, layer 2 plays at 1–2s, etc. Boxes with the same layer play together.
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Select a box.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AnimStepNode = (props: { id: string; data: AnimNodeDataView; selected?: boolean }) => {
  const updateNode = useSimStore((s) => s.updateAnimationDraftNodeData);
  const removeNode = useSimStore((s) => s.removeAnimationDraftNode);
  const joints = useSimStore((s) => s.joints);
  const jointsLabelByName = useMemo(() => new Map(joints.map((j) => [j.name, j.label] as const)), [joints]);
  const [layerText, setLayerText] = useState(() =>
    String(Number.isFinite(props.data.layer) ? Math.max(1, Math.floor(props.data.layer)) : 1),
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLayerText(String(Number.isFinite(props.data.layer) ? Math.max(1, Math.floor(props.data.layer)) : 1));
  }, [props.data.layer]);

  const commitLayer = () => {
    const n = Math.floor(Number(layerText));
    if (!Number.isFinite(n) || n <= 0) {
      setLayerText(String(Math.max(1, Math.floor(props.data.layer || 1))));
      return;
    }
    // Clamp to a reasonable range to prevent accidental huge layers.
    const clamped = Math.min(Math.max(n, 1), 999);
    if (clamped !== Math.floor(props.data.layer)) updateNode(props.id, { layer: clamped });
    setLayerText(String(clamped));
  };

  const layerInt = Math.max(1, Math.floor(props.data.layer));
  const hue = layerHue(layerInt);
  const layerBar = `hsla(${hue}, 90%, 62%, 0.55)`;
  const layerBarSoft = `hsla(${hue}, 90%, 62%, 0.16)`;

  return (
    <div
      style={{
        minWidth: 260,
        borderRadius: 14,
        border: `1px solid ${
          props.selected
            ? 'rgba(59, 130, 246, 0.55)'
            : props.data.__highlighted
              ? 'rgba(245, 158, 11, 0.55)'
              : 'rgba(255,255,255,0.12)'
        }`,
        background: props.data.__highlighted ? 'rgba(245, 158, 11, 0.06)' : 'rgba(15, 18, 25, 0.86)',
        boxShadow: props.data.__highlighted
          ? '0 10px 34px rgba(0,0,0,0.38), 0 0 0 2px rgba(245, 158, 11, 0.18) inset'
          : '0 10px 34px rgba(0,0,0,0.38)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '8px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.10)',
          background: `linear-gradient(90deg, ${layerBarSoft} 0%, rgba(0,0,0,0.20) 65%)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: layerBar,
                boxShadow: `0 0 18px ${layerBar}`,
                flex: '0 0 auto',
              }}
              title={`Layer ${layerInt}`}
            />
            <span>Box</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Layer</div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={layerText}
            onChange={(e) => {
              // Keep only digits (so wheel/scroll cannot mutate it like type=number does).
              const next = e.target.value.replace(/[^\d]/g, '');
              setLayerText(next);
            }}
            onWheel={(e) => {
              // Prevent trackpad/wheel from interacting with this input.
              e.preventDefault();
              e.stopPropagation();
              (e.currentTarget as HTMLInputElement).blur();
            }}
            onBlur={() => commitLayer()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            onPointerDown={(e) => {
              // Don’t start node-drag while editing.
              e.stopPropagation();
            }}
            style={{ width: 64 }}
          />
        </div>
        <button className="topHudBtn" onClick={() => removeNode(props.id)} style={{ padding: '4px 8px', fontSize: 11, borderColor: 'rgba(239, 68, 68, 0.45)' }}>
          Del
        </button>
      </div>

      <div style={{ padding: 10, display: 'grid', gap: 8 }}>
        <div className="animField">
          <div className="animFieldLabel">Target</div>
          <select
            className="animSelect"
            value={props.data.target.kind === 'baseYaw' ? '__baseYaw__' : props.data.target.name}
            onChange={(e) => {
              const v = e.target.value;
              const target: AnimTarget = v === '__baseYaw__' ? { kind: 'baseYaw' } : { kind: 'joint', name: v };
              updateNode(props.id, { target });
            }}
          >
            <option value="__baseYaw__">BaseYaw</option>
            {joints.map((j) => (
              <option key={j.name} value={j.name}>
                {jointsLabelByName.get(j.name) ?? j.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="animField">
            <div className="animFieldLabel">Start (deg)</div>
            <input
              type="number"
              value={Number.isFinite(props.data.__autoStartDeg) ? Number((props.data.__autoStartDeg ?? 0).toFixed(2)) : 0}
              step={0.5}
              disabled
              title="Start is automatic (previous layer end, or 0 if unset)"
              style={{ opacity: 0.7 }}
            />
          </div>
          <div className="animField">
            <div className="animFieldLabel">End (deg)</div>
            <input type="number" value={Number.isFinite(props.data.endDeg) ? Number(props.data.endDeg.toFixed(2)) : 0} step={0.5} onChange={(e) => updateNode(props.id, { endDeg: clampNumber(Number(e.target.value)) })} />
          </div>
        </div>
      </div>
    </div>
  );
};


