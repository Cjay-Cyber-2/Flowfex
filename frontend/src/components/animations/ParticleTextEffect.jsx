import React, { startTransition, useEffect, useMemo, useState } from 'react';

export function ParticleTextEffect({
  words = ['Flowfex', 'Connect', 'Orchestrate', 'Guide', 'Automate'],
  intervalMs = 4000,
}) {
  const safeWords = useMemo(
    () => (Array.isArray(words) && words.length > 0 ? words : ['Flowfex']),
    [words]
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [safeWords]);

  useEffect(() => {
    if (safeWords.length < 2) {
      return undefined;
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      startTransition(() => {
        setActiveIndex((current) => (current + 1) % safeWords.length);
      });
    }, Math.max(intervalMs, 1800));

    return () => {
      window.clearInterval(intervalId);
    };
  }, [intervalMs, safeWords]);

  return (
    <div className="statement-word-rotator" aria-live="polite">
      <span className="statement-word-glow statement-word-glow-left" />
      <span className="statement-word-glow statement-word-glow-right" />
      <div className="statement-word-frame">
        <span key={safeWords[activeIndex]} className="statement-word-current">
          {safeWords[activeIndex]}
        </span>
      </div>
      {safeWords.length > 1 ? (
        <div className="statement-word-pips" aria-hidden="true">
          {safeWords.map((word, index) => (
            <span
              key={word}
              className={`statement-word-pip${index === activeIndex ? ' is-active' : ''}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default ParticleTextEffect;
