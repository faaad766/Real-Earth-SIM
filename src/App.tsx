import React from 'react';
import { useUIStore } from '@/store/UIStore';
import MainMenu from '@/pages/MainMenu';
import SimulationWorkspace from '@/pages/SimulationWorkspace';

const App: React.FC = () => {
  const screen = useUIStore(s => s.screen);
  return (
    <div className="w-full h-full" style={{ background: '#080810' }}>
      {screen === 'menu' ? <MainMenu /> : <SimulationWorkspace />}
    </div>
  );
};

export default App;
