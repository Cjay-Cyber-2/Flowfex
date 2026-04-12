import React from 'react';

const bridgeCards = [
  {
    title: 'IDE side-panel agents',
    copy: 'Connect editor agents and extensions without locking Flowfex to one host app.',
  },
  {
    title: 'CLI agents',
    copy: 'Route terminal agents through Flowfex so resource pulls and live steps stay visible.',
  },
  {
    title: 'Website embedded agents',
    copy: 'Attach support bots and embedded assistants through the same shared bridge.',
  },
  {
    title: 'Web app agents',
    copy: 'Give product-native agents access to the same tool and skill layer as every other agent.',
  },
  {
    title: 'Prompt attach',
    copy: 'Paste a short Flowfex prompt into an existing agent and start reporting structured steps.',
  },
  {
    title: 'Link, SDK, or live channel',
    copy: 'Use the connection model that fits the environment and keep the session in sync.',
  },
];

function SocialProofSection() {
  return (
    <section id="bridge" data-section-id="bridge" className="social-proof-section bridge-section">
      <div className="radial-gradient-bg" />
      
      <div className="content-container">
        <header className="section-header">
          <span className="section-kicker">CONNECT FROM ANYWHERE</span>
          <h2 className="section-headline">Flowfex works with the agents you already use.</h2>
          <p className="bridge-subhead">
            Connect from an IDE panel, a CLI session, a website agent, a web app agent, or a live SDK bridge.
            Flowfex becomes the shared layer in the middle.
          </p>
        </header>

        <div className="bridge-grid">
          {bridgeCards.map((card) => (
            <article key={card.title} className="bridge-card">
              <strong>{card.title}</strong>
              <p>{card.copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default SocialProofSection;
