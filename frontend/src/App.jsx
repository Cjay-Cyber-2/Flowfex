import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LiveDemoPage from './pages/LiveDemoPage';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import Onboarding from './pages/Onboarding';
import AppEntry from './pages/AppEntry';
import OrchestrationCanvas from './pages/OrchestrationCanvas';
import SessionDetail from './pages/SessionDetail';
import History from './pages/History';
import Settings from './pages/Settings';
import PricingPage from './pages/PricingPage';
import Toast from './components/common/Toast';
import SyniqUsernameGate from './components/auth/SyniqUsernameGate';
import RequireAttachedAgent from './components/auth/RequireAttachedAgent';
import ChooseUsername from './pages/ChooseUsername';
import useStore from './store/useStore';
import { useSessionContext } from './context/SessionContext';

function App() {
  const { sessionReady } = useSessionContext();
  const initSocketListeners = useStore((state) => state.initSocketListeners);

  useEffect(() => {
    if (!sessionReady) {
      return;
    }

    initSocketListeners();
  }, [initSocketListeners, sessionReady]);

  return (
    <>
      <SyniqUsernameGate />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<LiveDemoPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAttachedAgent>
              <OrchestrationCanvas />
            </RequireAttachedAgent>
          }
        />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/choose-username" element={<ChooseUsername />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/reset-password" element={<ForgotPassword />} />
        <Route path="/app" element={<AppEntry />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/canvas" element={<Navigate to="/dashboard" replace />} />
        <Route path="/session/:id" element={<SessionDetail />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </>
  );
}

export default App;
