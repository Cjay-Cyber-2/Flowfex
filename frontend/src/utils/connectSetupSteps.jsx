import React from 'react';

/** Exact phrases users paste into chat (not terminal commands). */
export const CONNECT_COPY_PHRASES = {
  promptAttach: 'attach to Syniq for this session',
  mcpAttach: 'Use the syniq_attach MCP tool now to connect this Syniq session.',
  mcpRouteHint: 'syniq_route_task',
};

/**
 * Setup steps per connect tab.
 * Each step is { parts: [{ text, highlight?: boolean, mono?: boolean }] }
 */
export const CONNECT_SETUP_STEPS = {
  Prompt: [
    {
      parts: [
        { text: 'Click ' },
        { text: 'Copy', highlight: true, mono: true },
        { text: ' below to reveal the connection contract, then copy the full block.' },
      ],
    },
    {
      parts: [
        { text: 'In your agent, open where rules live — ' },
        { text: 'Settings → Rules', highlight: true, mono: true },
        { text: ', ' },
        { text: 'Project Instructions', highlight: true, mono: true },
        { text: ', or a ' },
        { text: 'Custom Instructions', highlight: true, mono: true },
        { text: ' field. Paste the contract and save.' },
      ],
    },
    {
      parts: [
        { text: 'In the same chat, send this exact line (copy it): ' },
        { text: CONNECT_COPY_PHRASES.promptAttach, highlight: true, mono: true, copy: true },
      ],
    },
    {
      parts: [
        { text: 'Keep this Syniq page open until the footer says the agent is connected.' },
      ],
    },
  ],
  MCP: [
    {
      parts: [
        { text: 'Click ' },
        { text: 'Copy', highlight: true, mono: true },
        { text: ' below to reveal your MCP JSON. It already includes your ' },
        { text: 'SYNIQ_SESSION_ID', highlight: true, mono: true },
        { text: ' and ' },
        { text: 'SYNIQ_SESSION_TOKEN', highlight: true, mono: true },
        { text: ' for this visit.' },
      ],
    },
    {
      parts: [
        { text: 'In your IDE, open ' },
        { text: 'Settings', highlight: true, mono: true },
        { text: ', search for ' },
        { text: 'MCP', highlight: true, mono: true },
        { text: ', and open the MCP config file (often ' },
        { text: 'mcp.json', highlight: true, mono: true },
        { text: ' or ' },
        { text: '.cursor/mcp.json', highlight: true, mono: true },
        { text: ' in the project folder).' },
      ],
    },
    {
      parts: [
        { text: 'Replace the MCP section with the JSON you copied. Save the file.' },
      ],
    },
    {
      parts: [
        { text: 'Fully quit the IDE (not just close the chat tab), then open it again so MCP reloads.' },
      ],
    },
    {
      parts: [
        { text: 'Copy the next message in step 6 and paste it directly into the agent chat.' },
      ],
    },
    {
      parts: [
        { text: CONNECT_COPY_PHRASES.mcpAttach, highlight: true, mono: true, copy: true },
      ],
    },
    {
      parts: [
        { text: 'For every new user message, the agent must call the ' },
        { text: 'syniq_route_task', highlight: true, mono: true },
        { text: ' MCP tool with your exact words before it replies.' },
      ],
    },
    {
      parts: [
        { text: 'Stay on this page until Syniq shows connected.' },
      ],
    },
  ],
  Link: [
    {
      parts: [
        { text: 'Click ' },
        { text: 'Copy', highlight: true, mono: true },
        { text: ' next to the link below (or open it in the browser where your agent runs).' },
      ],
    },
    {
      parts: [
        { text: 'Finish the one-time attach screen in that browser tab.' },
      ],
    },
    {
      parts: [
        { text: 'Come back here and wait until Syniq shows connected.' },
      ],
    },
  ],
  SDK: [
    {
      parts: [
        { text: 'Click ' },
        { text: 'Copy', highlight: true, mono: true },
        { text: ' below to reveal the code snippet for this session.' },
      ],
    },
    {
      parts: [
        { text: 'Paste the snippet into a file such as ' },
        { text: 'attach-syniq.js', highlight: true, mono: true },
        { text: ' in your project folder.' },
      ],
    },
    {
      parts: [
        { text: 'In a terminal, go to that folder and run: ' },
        { text: 'node attach-syniq.js', highlight: true, mono: true, copy: true },
      ],
    },
    {
      parts: [
        { text: 'Leave the terminal window open until Syniq shows connected on this page.' },
      ],
    },
  ],
  'Live Channel': [
    {
      parts: [
        { text: 'Click ' },
        { text: 'Copy', highlight: true, mono: true },
        { text: ' below to reveal the live-channel payload.' },
      ],
    },
    {
      parts: [
        { text: 'Paste it into your always-on app where you configure the Syniq socket or stream URL.' },
      ],
    },
    {
      parts: [
        { text: 'Start (or restart) that app so it connects and sends the attach handshake.' },
      ],
    },
    {
      parts: [
        { text: 'Wait on this page until Syniq shows connected.' },
      ],
    },
  ],
};

function CopyChip({ text }) {
  const [copied, setCopied] = React.useState(false);

  const onCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button type="button" className="cam-step-copy" onClick={onCopy} aria-label="Copy phrase">
      {copied ? 'Copied' : 'Copy phrase'}
    </button>
  );
}

/** @deprecated Renamed to CONNECT_SETUP_STEPS — kept so stale imports fail softly in devtools only */
export const CONNECTION_SETUP_STEPS = CONNECT_SETUP_STEPS;

export function ConnectSetupStep({ step }) {
  if (!step?.parts) {
    return null;
  }

  return (
    <>
      {step.parts.map((part, index) => {
        if (part.highlight) {
          const wrapClass = part.copy
            ? 'cam-step-highlight-wrap cam-step-highlight-wrap--copyable'
            : 'cam-step-highlight-wrap';
          return (
            <span key={`${part.text}-${index}`} className={wrapClass}>
              <span className={`cam-step-highlight${part.mono ? ' cam-step-highlight--mono' : ''}`}>
                {part.mono ? `"${part.text}"` : part.text}
              </span>
              {part.copy ? <CopyChip text={part.text} /> : null}
            </span>
          );
        }
        return <React.Fragment key={`${part.text}-${index}`}>{part.text}</React.Fragment>;
      })}
    </>
  );
}
