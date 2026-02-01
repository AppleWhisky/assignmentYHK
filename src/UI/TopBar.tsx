import { useSimStore } from '@/store/useSimStore';

export const TopBar = () => {
  const collision = useSimStore((s) => s.collision);
  const selected = useSimStore((s) => s.selected);
  const joints = useSimStore((s) => s.joints);
  const obstacles = useSimStore((s) => s.obstacles);
  const showCollisionBoxes = useSimStore((s) => s.showCollisionBoxes);
  const setShowCollisionBoxes = useSimStore((s) => s.setShowCollisionBoxes);
  const showReachability = useSimStore((s) => s.showReachability);
  const setShowReachability = useSimStore((s) => s.setShowReachability);
  const resetRobotPose = useSimStore((s) => s.resetRobotPose);
  const resetCamera = useSimStore((s) => s.resetCamera);
  const resetScene = useSimStore((s) => s.resetScene);
  const animationEditorOpen = useSimStore((s) => s.animationEditorOpen);
  const setAnimationEditorOpen = useSimStore((s) => s.setAnimationEditorOpen);

  const statusColor =
    collision.severity === 'collision'
      ? 'var(--danger)'
      : collision.severity === 'warning'
        ? 'var(--warning)'
        : 'var(--success)';

  const selectionText = (() => {
    if (!selected) return 'Selection: None';
    if (selected.kind === 'robot') return 'Selection: Robot';
    if (selected.kind === 'joint') {
      const j = joints.find((x) => x.name === selected.name);
      return `Selection: Robot › ${j?.label ?? selected.name}`;
    }
    if (selected.kind === 'obstacle') {
      const o = obstacles.find((x) => x.id === selected.id);
      return `Selection: Obstacles › ${o?.name ?? selected.id}`;
    }
    return 'Selection: None';
  })();

  const collisionDetailText = (() => {
    const list =
      collision.severity === 'collision'
        ? collision.collidingMeshNames
        : collision.severity === 'warning'
          ? collision.warningMeshNames
          : [];
    if (!list.length) return null;

    const label = collision.severity === 'collision' ? 'Hit' : 'Near';
    const names = list
      .filter(Boolean)
      .map((n) => n.replace(/^Arm01_/, '').replace(/^Arm02_/, '').replace(/^Arm03_/, ''))
      .slice(0, 2);
    const extra = list.length - names.length;
    return `${label}: ${names.join(', ')}${extra > 0 ? ` +${extra}` : ''}`;
  })();

  return (
    <div className="topHud">
      <div className="topHudSection">
        <div className="topHudTitle">
          <span className="topHudTitleText">Robot Arm Control Project</span>
          <span className="topHudVersion">v2</span>
        </div>
        <div className="topHudCrumb">
          <span>{selectionText}</span>
          {collisionDetailText ? (
            <>
              <span style={{ opacity: 0.6 }}> · </span>
              <span>{collisionDetailText}</span>
            </>
          ) : null}
        </div>
      </div>

      <div className="topHudSection topHudCenter">
        <div className="topHudStatus" style={{ borderColor: statusColor }}>
          <span className="topHudStatusDot" style={{ background: statusColor }} />
          <span style={{ color: 'var(--muted)' }}>SYSTEM:</span>
          <span>{collision.severity.toUpperCase()}</span>
        </div>
      </div>

      <div className="topHudSection topHudRight">
        <button
          className="topHudBtn"
          onClick={() => setAnimationEditorOpen(!animationEditorOpen)}
          style={{ borderColor: animationEditorOpen ? 'rgba(59, 130, 246, 0.45)' : undefined }}
        >
          Animator
        </button>

        <label className="topHudToggle">
          <input
            type="checkbox"
            checked={showCollisionBoxes}
            onChange={(e) => setShowCollisionBoxes(e.target.checked)}
          />
          Boxes
        </label>

        <label className="topHudToggle" title="Show reachability guide (approx.)">
          <input
            type="checkbox"
            checked={showReachability}
            onChange={(e) => setShowReachability(e.target.checked)}
          />
          Reach
        </label>

        <button className="topHudBtn" onClick={() => resetCamera()}>
          Home view
        </button>
        <button className="topHudBtn" onClick={() => resetRobotPose()}>
          Reset pose
        </button>
        <button className="topHudBtn" onClick={() => resetScene()}>
          Reset scene
        </button>

        <div className="topHudLive">
          <span className="topHudPulse" />
          SIM_LIVE
        </div>
      </div>
    </div>
  );
};
