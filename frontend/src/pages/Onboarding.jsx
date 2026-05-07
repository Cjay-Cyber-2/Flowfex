import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import FlowfexLogoNew from '../components/FlowfexLogoNew';
import ConnectAgentModal from '../components/ConnectAgentModal';
import PulseBeams from '../components/animations/PulseBeams';
import useStore from '../store/useStore';
import { isLiveConnectedAgent } from '../utils/agentPresence';
import '../styles/onboarding.css';

const ONBOARDING_BEAMS = [
  {
    path: 'M 80 217 C 200 217, 300 217, 429 217',
    gradientConfig: {
      initial: { x1: '0%', x2: '0%', y1: '0%', y2: '0%' },
      animate: { x1: ['0%', '100%'], x2: ['0%', '110%'], y1: ['0%', '0%'], y2: ['0%', '0%'] },
      transition: { duration: 3, repeat: Infinity, ease: 'linear', repeatDelay: 0.2 },
    },
    connectionPoints: [
      { cx: 80, cy: 217, r: 5 },
      { cx: 429, cy: 217, r: 5 },
    ],
  },
  {
    path: 'M 80 140 C 180 140, 280 180, 429 200',
    gradientConfig: {
      initial: { x1: '0%', x2: '0%', y1: '0%', y2: '0%' },
      animate: { x1: ['0%', '100%'], x2: ['0%', '110%'], y1: ['0%', '0%'], y2: ['0%', '0%'] },
      transition: { duration: 2.6, repeat: Infinity, ease: 'linear', delay: 0.4, repeatDelay: 0.5 },
    },
    connectionPoints: [{ cx: 80, cy: 140, r: 4 }],
  },
  {
    path: 'M 80 294 C 180 294, 280 260, 429 234',
    gradientConfig: {
      initial: { x1: '0%', x2: '0%', y1: '0%', y2: '0%' },
      animate: { x1: ['0%', '100%'], x2: ['0%', '110%'], y1: ['0%', '0%'], y2: ['0%', '0%'] },
      transition: { duration: 2.8, repeat: Infinity, ease: 'linear', delay: 0.8, repeatDelay: 0.3 },
    },
    connectionPoints: [{ cx: 80, cy: 294, r: 4 }],
  },
  {
    path: 'M 429 200 C 550 178, 650 152, 778 134',
    gradientConfig: {
      initial: { x1: '0%', x2: '0%', y1: '0%', y2: '0%' },
      animate: { x1: ['0%', '100%'], x2: ['0%', '110%'], y1: ['0%', '0%'], y2: ['0%', '0%'] },
      transition: { duration: 2.4, repeat: Infinity, ease: 'linear', delay: 1.0, repeatDelay: 0.4 },
    },
    connectionPoints: [{ cx: 778, cy: 134, r: 5 }],
  },
  {
    path: 'M 429 234 C 550 256, 650 280, 778 300',
    gradientConfig: {
      initial: { x1: '0%', x2: '0%', y1: '0%', y2: '0%' },
      animate: { x1: ['0%', '100%'], x2: ['0%', '110%'], y1: ['0%', '0%'], y2: ['0%', '0%'] },
      transition: { duration: 2.7, repeat: Infinity, ease: 'linear', delay: 0.5, repeatDelay: 0.6 },
    },
    connectionPoints: [{ cx: 778, cy: 300, r: 5 }],
  },
  {
    path: 'M 429 217 C 560 217, 660 217, 778 217',
    gradientConfig: {
      initial: { x1: '0%', x2: '0%', y1: '0%', y2: '0%' },
      animate: { x1: ['0%', '100%'], x2: ['0%', '110%'], y1: ['0%', '0%'], y2: ['0%', '0%'] },
      transition: { duration: 2.2, repeat: Infinity, ease: 'linear', delay: 1.5, repeatDelay: 0.2 },
    },
    connectionPoints: [{ cx: 778, cy: 217, r: 6 }],
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const activeSession = useStore((state) => state.activeSession);
  const connectedAgents = useStore((state) => state.connectedAgents);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectionStage, setConnectionStage] = useState('idle');
  const transitionTimersRef = useRef([]);

  useEffect(() => {
    const hasLiveAgent = Array.isArray(connectedAgents)
      && connectedAgents.some((agent) => agent && agent.status === 'connected' && isLiveConnectedAgent(agent));
    if (activeSession?.id && hasLiveAgent && connectionStage === 'idle') {
      navigate('/dashboard', { replace: true });
    }
  }, [activeSession, connectedAgents, connectionStage, navigate]);

  const clearTransitionTimers = useCallback(() => {
    transitionTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    transitionTimersRef.current = [];
  }, []);

  const handleConnected = useCallback(() => {
    clearTransitionTimers();
    setIsModalOpen(false);
    setConnectionStage('zooming');
    transitionTimersRef.current = [
      window.setTimeout(() => setConnectionStage('splitting'), 1100),
      window.setTimeout(() => navigate('/dashboard'), 1950),
    ];
  }, [clearTransitionTimers, navigate]);

  useEffect(() => clearTransitionTimers, [clearTransitionTimers]);

  return (
    <div className="ob-root">
      <div className="ob-dotgrid" />

      <header className="ob-topbar" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost"
          style={{ padding: '8px', minWidth: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FlowfexLogoNew size={30} animated={false} />
        </div>
        <div style={{ width: '40px' }} aria-hidden="true" />
      </header>

      <main className="ob-center">
        <div className="ob-beams-layer">
          <PulseBeams
            beams={ONBOARDING_BEAMS}
            width={858}
            height={434}
            gradientColors={{ start: '#00D4AA', middle: '#1dcad3', end: '#7FFFF0' }}
            baseColor="rgba(255,255,255,0.06)"
            accentColor="rgba(0,212,170,0.3)"
          />
        </div>

        <AnimatePresence>
          {connectionStage !== 'idle' ? (
            <motion.div
              className="ob-transition-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="ob-transition-panel ob-transition-panel-left"
                animate={connectionStage === 'splitting' ? { x: '-58%' } : { x: 0 }}
                transition={{ duration: 0.78, ease: [0.2, 0.9, 0.2, 1] }}
              />
              <motion.div
                className="ob-transition-panel ob-transition-panel-right"
                animate={connectionStage === 'splitting' ? { x: '58%' } : { x: 0 }}
                transition={{ duration: 0.78, ease: [0.2, 0.9, 0.2, 1] }}
              />
              <motion.div
                className="ob-transition-seam"
                animate={connectionStage === 'splitting'
                  ? { opacity: 0.08, scaleY: 1.5 }
                  : { opacity: 0.86, scaleY: 1 }
                }
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
              <motion.div
                className="ob-transition-core"
                animate={connectionStage === 'splitting'
                  ? { scale: 13.5, opacity: 0.96 }
                  : { scale: 1.18, opacity: 1 }
                }
                transition={{ duration: 0.82, ease: [0.22, 0.61, 0.36, 1] }}
              >
                <motion.div
                  className="ob-transition-spiral ob-transition-spiral-primary"
                  animate={connectionStage === 'splitting'
                    ? { rotate: 420, scale: 1.45, opacity: 0.2 }
                    : { rotate: 180, scale: 1, opacity: 0.96 }
                  }
                  transition={{ duration: 1.1, ease: 'easeInOut' }}
                />
                <motion.div
                  className="ob-transition-spiral ob-transition-spiral-secondary"
                  animate={connectionStage === 'splitting'
                    ? { rotate: -360, scale: 1.8, opacity: 0.12 }
                    : { rotate: -150, scale: 1.06, opacity: 0.72 }
                  }
                  transition={{ duration: 1.1, ease: 'easeInOut' }}
                />
                <div className="ob-transition-shell">
                  <FlowfexLogoNew size={62} animated={false} />
                </div>
              </motion.div>

              {connectionStage === 'zooming' ? (
                <motion.div
                  className="ob-connected-label"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, delay: 0.12 }}
                >
                  <CheckCircle size={18} />
                  Agent connected. Routing into the dashboard.
                </motion.div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {connectionStage === 'idle' ? (
          <div className="ob-stack">
            <motion.div
              className="ob-circle"
              animate={{ scale: [1, 1.08, 1], opacity: [0.84, 1, 0.84] }}
              transition={{ duration: 2.1, repeat: Infinity }}
            >
              <FlowfexLogoNew size={34} animated={false} />
            </motion.div>
            <p className="ob-headline">Connect your first agent to begin.</p>
            <p className="ob-copy-subline">
              Open Connect Agent and run the Flowfex contract in your agent. You only go to the dashboard after Flowfex verifies a real attach.
            </p>
            <button type="button" className="ob-cta-btn" onClick={() => setIsModalOpen(true)}>
              Connect Agent
            </button>
          </div>
        ) : null}
      </main>

      <ConnectAgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnected={handleConnected}
      />
    </div>
  );
}
