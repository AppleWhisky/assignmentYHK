import { RobotScene } from '@/Three/RobotScene';
import { JogPanel } from '@/UI/JogPanel';

const App = () => {
  return (
    <div className="app">
      <RobotScene />
      <JogPanel />
    </div>
  );
};

export default App;
