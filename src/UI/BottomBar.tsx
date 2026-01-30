export const BottomBar = () => {
  return (
    <div
      style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}
    >
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
        Bottom bar (reserved for future tools)
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
        Tip: Use the Jog panel to move joints
      </div>
    </div>
  );
};
