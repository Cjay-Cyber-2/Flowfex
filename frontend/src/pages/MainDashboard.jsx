import React, { useEffect } from 'react';
import useStore from '../store/useStore';
import LeftRail from '../components/layout/LeftRail';
import TopBar from '../components/layout/TopBar';
import CanvasRenderer from '../components/canvas/CanvasRenderer';
import NodeDetailPanel from '../components/layout/NodeDetailPanel';
import ConnectAgentModal from '../components/ConnectAgentModal';
import './MainDashboard.css';

function MainDashboard() {
  const {
    isConnectModalOpen,
    setConnectModalOpen,
    apiFetchSessions,
    apiFetchSkills,
  } = useStore();

  useEffect(() => {
    apiFetchSessions();
    apiFetchSkills();
  }, [apiFetchSessions, apiFetchSkills]);

  return (
    <div className="main-dashboard">
      <TopBar />
      <div className="dashboard-layout">
        <LeftRail />
        <main className="dashboard-viewport">
          <CanvasRenderer />
        </main>
        <NodeDetailPanel />
      </div>
      <ConnectAgentModal
        isOpen={isConnectModalOpen}
        onClose={() => setConnectModalOpen(false)}
      />
    </div>
  );
}

export default MainDashboard;
