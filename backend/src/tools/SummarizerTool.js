import { Tool } from '../types/Tool.js';

/**
 * SummarizerTool
 * 
 * Condenses text to a concise summary using the LLM.
 * Useful for processing large documents, articles, or reports.
 */
export function createSummarizerTool() {
  return new Tool({
    id: 'tool.summarizer',
    name: 'Summarizer',
    description: 'Condenses text into a concise summary while retaining key information',
    prompt: `You are an expert summarizer. Your task is to read the provided text and create a clear, concise summary that captures all the essential information. Follow these guidelines:

1. Keep the summary to the specified length
2. Preserve all critical facts and numbers
3. Maintain the original meaning and context
4. Use clear, simple language
5. Do not include your own opinions or interpretations
6. Avoid repetition

Provide only the summary without any preamble or explanation.`,
    
    keywords: ['summarize', 'summary', 'condense', 'brief', 'abstract', 'digest'],
    
    metadata: {
      category: 'text',
      version: '1.0.0',
      tags: ['summarization', 'nlp', 'text-processing']
    },

    prepareInput: async (input) => {
      if (typeof input === 'string') {
        return {
          text: input,
          maxWords: 100
        };
      }

      return input;
    },

    run: async (input, llm, runtime) => {
      runtime?.reportProgress({
        phase: 'validate',
        current: 1,
        total: 4,
        message: 'Validating summarization input'
      });

      // Input validation
      if (!input || typeof input !== 'object') {
        throw new Error('SummarizerTool expects an object with text and optional maxWords');
      }

      const { text, maxWords = 100 } = input;

      if (!text || typeof text !== 'string') {
        throw new Error('text field is required and must be a string');
      }

      if (text.trim().length === 0) {
        throw new Error('text cannot be empty');
      }

      if (typeof maxWords !== 'number' || maxWords < 10) {
        throw new Error('maxWords must be a number >= 10');
      }

      try {
        // Use the LLM to generate a summary
        const systemPrompt = `You are an expert summarizer. Create a summary of approximately ${maxWords} words. Return only the summary, no additional commentary.`;
        runtime?.reportProgress({
          phase: 'summarize',
          current: 2,
          total: 4,
          message: 'Generating summary with the LLM'
        });
        const summary = await llm.generate(systemPrompt, text, { runtime });

        runtime?.reportProgress({
          phase: 'finalize',
          current: 3,
          total: 4,
          message: 'Finalizing summary payload'
        });

        return {
          success: true,
          originalLength: text.split(/\s+/).length,
          summaryLength: summary.split(/\s+/).length,
          summary: summary.trim(),
          maxWordsRequested: maxWords
        };
      } catch (error) {
        throw new Error(`SummarizerTool execution failed: ${error.message}`);
      }
    }
  });
}

export const summarizerTool = createSummarizerTool();
