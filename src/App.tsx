import { RobotScene } from '@/Three/RobotScene';
import { JogPanel } from '@/UI/JogPanel';
import { ObstaclePanel } from '@/UI/ObstaclePanel';
import { TopBar } from '@/UI/TopBar';
import { BottomBar } from '@/UI/BottomBar';
import { OverlayLayout } from '@/UI/layout/OverlayLayout';
import { CollapsiblePanel } from '@/UI/CollapsiblePanel';

const App = () => {
  return (
    <div className="app">
      <RobotScene />
      <OverlayLayout
        top={<TopBar />}
        left={
          <CollapsiblePanel title="Obstacles" dockSide="left">
            <ObstaclePanel />
          </CollapsiblePanel>
        }
        right={
          <CollapsiblePanel title="Jog" dockSide="right">
            <JogPanel />
          </CollapsiblePanel>
        }
        bottom={<BottomBar />}
      />
    </div>
  );
};

export default App;
