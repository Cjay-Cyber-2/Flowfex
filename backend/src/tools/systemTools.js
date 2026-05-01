import { Tool } from '../types/Tool.js';

export const weatherTool = new Tool({
  id: 'tool.weather',
  name: 'Weather Tool',
  description: 'Returns a mocked weather response for compatibility demos.',
  prompt: 'Provide a concise weather update for the supplied location or request.',
  keywords: ['weather', 'temperature', 'forecast', 'rain', 'sun'],
  metadata: {
    category: 'utility',
    version: '1.0.0',
    tags: ['weather', 'demo', 'compatibility']
  },
  run: async (input) => ({
    success: true,
    input,
    forecast: 'The weather is currently sunny and 75°F.'
  })
});

export const calculatorTool = new Tool({
  id: 'tool.calculator',
  name: 'Calculator Tool',
  description: 'Returns a mocked calculator response for compatibility demos.',
  prompt: 'Perform a simple calculation based on the provided request.',
  keywords: ['calculate', 'math', 'add', 'subtract', 'multiply', 'divide'],
  metadata: {
    category: 'utility',
    version: '1.0.0',
    tags: ['calculator', 'demo', 'compatibility']
  },
  run: async (input) => ({
    success: true,
    input,
    result: 42
  })
});

export const defaultTool = new Tool({
  id: 'tool.default-fallback',
  name: 'Default Fallback Tool',
  description: 'Fallback compatibility tool when nothing else matches.',
  prompt: 'Return a brief response explaining that no more specific tool matched.',
  metadata: {
    category: 'utility',
    version: '1.0.0',
    tags: ['fallback', 'demo']
  },
  run: async (input) => ({
    success: true,
    input,
    message: 'No specific tool matched the request.'
  })
});
