import { RobotScene } from '@/Three/RobotScene';
import { JogPanel } from '@/UI/JogPanel';
import { ObstaclePanel } from '@/UI/ObstaclePanel';
import { TopBar } from '@/UI/TopBar';
import { BottomBar } from '@/UI/BottomBar';
import { OverlayLayout } from '@/UI/layout/OverlayLayout';
import { CollapsiblePanel } from '@/UI/CollapsiblePanel';
import { useSimStore } from '@/store/useSimStore';
import { AnimationEditorOverlay } from '@/UI/AnimationEditor/AnimationEditorOverlay';
import { SimulationReportModal } from '@/UI/SimulationReport/SimulationReportModal';
import { useEffect } from 'react';

const App = () => {
  const severity = useSimStore((s) => s.collision.severity);
  const loadPresetAnimations = useSimStore((s) => s.loadPresetAnimations);
  const hasReport = useSimStore((s) => s.playbackReport.length > 0);
  useEffect(() => {
    void loadPresetAnimations();
  }, [loadPresetAnimations]);
  return (
    <div className="app">
      <div className="appHeader">
        <TopBar />
      </div>
      <div className="viewport">
        <RobotScene />
        <OverlayLayout
          left={
            <CollapsiblePanel title="Obstacles" dockSide="left" tone={severity}>
              <ObstaclePanel />
            </CollapsiblePanel>
          }
          right={
            <CollapsiblePanel title="Jog" dockSide="right" tone={severity}>
              <JogPanel />
            </CollapsiblePanel>
          }
          bottom={hasReport ? <BottomBar /> : null}
        />
        <AnimationEditorOverlay />
        <SimulationReportModal />
      </div>
    </div>
  );
};

export default App;
