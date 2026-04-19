export const faqs = [
  {
    question: 'What agents does Flowfex work with?',
    answer: 'Flowfex is agent-agnostic. You can connect IDE side-panel agents, CLI agents, website agents, web app agents, and custom clients through a prompt, link, SDK, or live channel.'
  },
  {
    question: 'What does Flowfex actually do?',
    answer: 'Flowfex sits between the agent and a shared store of tools, skills, and workflows. It helps the agent pull the right resources, builds a visible flow, and gives the user a live place to supervise the run.'
  },
  {
    question: 'How does the prompt connection work?',
    answer: 'You paste a short Flowfex instruction into the agent. The prompt tells the agent which Flowfex session to use, when to ask Flowfex for resources, how to report each step, and when to wait for approval.'
  },
  {
    question: 'Does the agent pull resources from Flowfex before acting?',
    answer: 'That is the idea. Flowfex should be the place where the agent retrieves the most relevant tools, skills, and workflows before it continues with the task.'
  },
  {
    question: 'Can I guide the run while it is live?',
    answer: 'Yes. Flowfex is built for supervision. Users can watch the path, pause a step, approve or reject a move, reroute the flow, or apply a higher-level constraint without manually wiring the whole graph.'
  },
  {
    question: 'Is sign-up required before I start?',
    answer: 'No. Flowfex is designed for low-friction onboarding. You can start with an anonymous session first and sign up later when you need saved work, sync, or higher limits.'
  },
  {
    question: 'How do prompt, link, SDK, and live channel differ?',
    answer: 'Prompt attach is the fastest way to start. A link is useful for quick sharing. The SDK is better for product integrations. A live channel is best when the agent already supports persistent streaming.'
  },
  {
    question: 'What do Map, Flow, and Live modes show?',
    answer: 'Map mode gives the full graph. Flow mode follows the active path. Live mode turns up the motion and state changes so you can watch execution as it moves through the system.'
  },
  {
    question: 'Does Flowfex replace the agent?',
    answer: 'No. Flowfex is the bridge and control layer around the agent. The agent still does the work, but it does that work through a clearer, more structured, and more visible execution path.'
  }
];
