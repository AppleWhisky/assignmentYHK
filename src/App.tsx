import { RobotScene } from '@/Three/RobotScene';
import { JogPanel } from '@/UI/JogPanel';
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
        right={
          <CollapsiblePanel title="Jog">
            <JogPanel />
          </CollapsiblePanel>
        }
        bottom={<BottomBar />}
      />
    </div>
  );
};

export default App;
