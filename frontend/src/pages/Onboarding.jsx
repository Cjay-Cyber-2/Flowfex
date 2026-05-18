import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import SyniqLogoNew from '../components/SyniqLogoNew';
import ConnectAgentModal from '../components/ConnectAgentModal';
import PulseBeams from '../components/animations/PulseBeams';
import useStore from '../store/useStore';
import { useSessionContext } from '../context/SessionContext';
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

// Syniq-branded spinning network Connect Agent button.
function AnimatedLayerButton({ children, onClick, className = '' }) {
  return (
    <button
      type="button"
      className={`ob-animated-layer-btn ${className}`}
      onClick={onClick}
    >
      <svg
        className="ob-animated-layer-svg"
        viewBox="0 0 1095.66 1095.63"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path fill="#242021" d="M1298,749.62c.4,300.41-243,548-548.1,547.9C446.23,1297.4,201.92,1051.2,202.29,749c.37-301.52,244.49-547.41,548.34-547.12C1055.43,202.18,1298.25,449.6,1298,749.62Z" transform="translate(-202.29 -201.89)" />
        <path fill="#00D4AA" d="M1285.89,749.79c-.25,297.07-241.24,535.86-536.12,535.66-296.34-.21-537-241.72-535.29-539,1.68-293.16,240.83-534.18,539.15-532.37C1046.8,215.84,1285.62,453.88,1285.89,749.79Z" transform="translate(-202.29 -201.89)" />
        <path fill="#fefefe" d="M1195.29,749.56c.54,244.73-198.67,446.2-446.87,445.33C503.27,1194,304,994.53,304.93,748c.91-244.52,199.12-443.08,444.39-443.49C997.43,304,1195.74,505.59,1195.29,749.56Z" transform="translate(-202.29 -201.89)" />
        <path fill="#00D4AA" d="M1097.23,749.87c.22,190.31-154.42,347.43-348,346.92-192-.5-346.48-156.44-346.17-347.7C403.33,558,558.18,402,751.08,402.55,944.62,403.09,1097.69,560.56,1097.23,749.87Z" transform="translate(-202.29 -201.89)" />
        <path fill="#0d1117" d="M1006.72,744.28c2.81,143.23-110.17,257.35-247.42,261.9C613.15,1011,498.22,895.93,493.71,758.88,488.93,613.71,603,498,740.69,493.28,886.73,488.24,1004,603.87,1006.72,744.28Z" transform="translate(-202.29 -201.89)" />
        <line x1="547.83" y1="547.81" x2="547.83" y2="300" stroke="#00D4AA" strokeWidth="24" strokeLinecap="round" />
        <line x1="547.83" y1="547.81" x2="762.7" y2="672" stroke="#00D4AA" strokeWidth="24" strokeLinecap="round" />
        <line x1="547.83" y1="547.81" x2="333.3" y2="672" stroke="#00D4AA" strokeWidth="24" strokeLinecap="round" />
        <line x1="547.83" y1="300" x2="762.7" y2="672" stroke="#00D4AA" strokeWidth="8" strokeLinecap="round" strokeDasharray="15, 20" />
        <line x1="762.7" y1="672" x2="333.3" y2="672" stroke="#00D4AA" strokeWidth="8" strokeLinecap="round" strokeDasharray="15, 20" />
        <line x1="333.3" y1="672" x2="547.83" y2="300" stroke="#00D4AA" strokeWidth="8" strokeLinecap="round" strokeDasharray="15, 20" />
        <circle cx="547.83" cy="547.81" r="55" fill="#00D4AA" />
        <circle cx="547.83" cy="547.81" r="25" fill="#0d1117" />
        <circle cx="547.83" cy="300" r="35" fill="#0d1117" stroke="#00D4AA" strokeWidth="16" />
        <circle cx="762.7" cy="672" r="35" fill="#0d1117" stroke="#00D4AA" strokeWidth="16" />
        <circle cx="333.3" cy="672" r="35" fill="#0d1117" stroke="#00D4AA" strokeWidth="16" />
      </svg>
      <span className="ob-animated-layer-text">{children}</span>
    </button>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { sessionReady, appState } = useSessionContext();
  const connectedAgents = useStore((state) => state.connectedAgents);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectionStage, setConnectionStage] = useState('idle');
  const transitionTimersRef = useRef([]);
  const autoTransitionStartedRef = useRef(false);

  const clearTransitionTimers = useCallback(() => {
    transitionTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    transitionTimersRef.current = [];
  }, []);

  const handleConnected = useCallback(() => {
    if (autoTransitionStartedRef.current) {
      return;
    }
    autoTransitionStartedRef.current = true;
    clearTransitionTimers();
    setIsModalOpen(false);
    setConnectionStage('zooming');
    transitionTimersRef.current = [
      window.setTimeout(() => setConnectionStage('splitting'), 1100),
      window.setTimeout(() => navigate('/dashboard'), 1950),
    ];
  }, [clearTransitionTimers, navigate]);

  useEffect(() => clearTransitionTimers, [clearTransitionTimers]);

  // Verified agent on this device: play the same transition (modal path or
  // returning visitor) so we never skip straight to /dashboard without the UX.
  useEffect(() => {
    if (!sessionReady || autoTransitionStartedRef.current) {
      return;
    }

    const serverAgent = appState?.gates?.agentConnectedServer === true;
    const hasLiveAgent = serverAgent
      || (Array.isArray(connectedAgents)
        && connectedAgents.some((agent) => isLiveConnectedAgent(agent)));

    if (hasLiveAgent) {
      handleConnected();
    }
  }, [appState, connectedAgents, handleConnected, sessionReady]);

  return (
    <div className="ob-root">
      <div className="ob-dotgrid" />

      <header className="ob-topbar">
        <button
          onClick={() => navigate(-1)}
          className="btn btn-ghost"
          style={{ padding: '8px', minWidth: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SyniqLogoNew size={30} animated={false} />
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
                style={{ transformOrigin: '50% 50%' }}
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
                  <SyniqLogoNew size={62} animated={false} />
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
          <div className="ob-stack ob-stack--minimal">
            <motion.div
              className="ob-circle"
              animate={{ scale: [1, 1.08, 1], opacity: [0.84, 1, 0.84] }}
              transition={{ duration: 2.1, repeat: Infinity }}
            >
              <SyniqLogoNew size={34} animated={false} />
            </motion.div>
            <AnimatedLayerButton onClick={() => setIsModalOpen(true)}>
              Connect Agent
            </AnimatedLayerButton>
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
