import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Sparkles } from 'lucide-react';
import SyniqLogoNew from '../SyniqLogoNew';
import {
  AGENT_INTENT_OPTIONS,
  recommendConnectionMethod,
  saveOnboardingProgress,
} from '../../utils/connectionRecommendations';

const ALL_CONNECTION_METHODS = ['Prompt', 'Link', 'SDK', 'Live Channel'];

export default function OnboardingAgentFlow({
  step,
  setStep,
  selectedAgentId,
  setSelectedAgentId,
  onOpenConnect,
  AnimatedLayerButton,
}) {
  const [showAdvancedMethods, setShowAdvancedMethods] = useState(false);
  const recommendation = useMemo(
    () => (selectedAgentId ? recommendConnectionMethod(selectedAgentId) : null),
    [selectedAgentId],
  );

  const handleSelectAgent = (agentId) => {
    setSelectedAgentId(agentId);
    const rec = recommendConnectionMethod(agentId);
    saveOnboardingProgress({ step: 'recommend', selectedAgentId: agentId, recommendedMethod: rec.method });
    setStep('recommend');
  };

  if (step === 'choose-agent') {
    return (
      <motion.div
        className="ob-step-panel"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="ob-circle ob-circle--compact"
          animate={{ scale: [1, 1.04, 1], opacity: [0.88, 1, 0.88] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <SyniqLogoNew size={72} animated={false} />
        </motion.div>
        <h1 className="ob-headline">What are you connecting?</h1>
        <p className="ob-copy-subline">
          Syniq will recommend the best connection method for your agent. The dashboard opens only after a real, verified attach.
        </p>
        <div className="ob-agent-grid">
          {AGENT_INTENT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="ob-agent-card"
              onClick={() => handleSelectAgent(option.id)}
            >
              <span className="ob-agent-card__label">{option.label}</span>
              <span className="ob-agent-card__desc">{option.description}</span>
            </button>
          ))}
        </div>
      </motion.div>
    );
  }

  if (step === 'recommend' && recommendation) {
    return (
      <motion.div
        className="ob-step-panel"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="ob-eyebrow">
          <Sparkles size={14} aria-hidden />
          Recommended for you
        </p>
        <h1 className="ob-headline">{recommendation.method} connection</h1>
        <div className="ob-recommend-card">
          <p className="ob-recommend-card__reason">{recommendation.reason}</p>
          <div className="ob-recommend-meta">
            <span>Setup: {recommendation.difficulty}</span>
            <span>{recommendation.expect}</span>
          </div>
          <button
            type="button"
            className="ob-cta-btn"
            onClick={() => onOpenConnect(recommendation.method)}
          >
            Continue with {recommendation.method}
          </button>
        </div>
        <div className="ob-advanced-wrap">
          <button
            type="button"
            className="ob-advanced-toggle"
            onClick={() => setShowAdvancedMethods((v) => !v)}
            aria-expanded={showAdvancedMethods}
          >
            Advanced connection options
            <ChevronDown size={16} className={showAdvancedMethods ? 'ob-chevron--open' : ''} />
          </button>
          {showAdvancedMethods ? (
            <div className="ob-method-grid">
              {ALL_CONNECTION_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  className={`ob-method-chip${method === recommendation.method ? ' ob-method-chip--active' : ''}`}
                  onClick={() => onOpenConnect(method)}
                >
                  {method}
                  {method === recommendation.method ? ' · recommended' : ''}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button type="button" className="btn btn-ghost ob-back-link" onClick={() => setStep('choose-agent')}>
          Choose a different agent type
        </button>
      </motion.div>
    );
  }

  if (step === 'connect') {
    return (
      <div className="ob-stack ob-stack--minimal">
        <motion.div
          className="ob-circle"
          animate={{ scale: [1, 1.06, 1], opacity: [0.88, 1, 0.88] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <SyniqLogoNew size={92} animated={false} />
        </motion.div>
        <p className="ob-copy-subline">
          Complete the connection setup below. Syniq confirms your agent on the server before opening the dashboard.
        </p>
        <AnimatedLayerButton onClick={() => onOpenConnect(null)}>
          Connect Agent
        </AnimatedLayerButton>
      </div>
    );
  }

  return null;
}
