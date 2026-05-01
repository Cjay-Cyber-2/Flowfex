import { Tool } from '../types/Tool.js';

/**
 * CodeGeneratorTool
 * 
 * Generates code snippets or complete functions from specifications.
 * Supports multiple languages and can generate tests, documentation, etc.
 */
export function createCodeGeneratorTool() {
  return new Tool({
    id: 'tool.code-generator',
    name: 'Code Generator',
    description: 'Generates code snippets, functions, or complete modules from specifications',
    prompt: `You are an expert code generator. Your task is to write clean, well-documented, production-ready code. Follow these guidelines:

1. Write code that is readable and maintainable
2. Include appropriate error handling
3. Add JSDoc or similar comments for functions
4. Follow best practices for the specified language
5. Avoid overly complex or cryptic implementations
6. Include example usage if relevant
7. Ensure the code is properly formatted

Generate only the code without any explanatory text before or after.`,
    
    keywords: ['code', 'generate', 'write', 'function', 'module', 'snippet', 'class'],
    
    metadata: {
      category: 'code',
      version: '1.0.0',
      tags: ['code-generation', 'programming', 'development']
    },

    prepareInput: async (input) => {
      if (typeof input === 'string') {
        return {
          specification: input,
          language: 'javascript',
          type: 'function'
        };
      }

      return input;
    },

    run: async (input, llm, runtime) => {
      runtime?.reportProgress({
        phase: 'validate',
        current: 1,
        total: 4,
        message: 'Validating code generation request'
      });

      // Input validation
      if (!input || typeof input !== 'object') {
        throw new Error('CodeGeneratorTool expects an object with specification and language');
      }

      const { specification, language = 'javascript', type = 'function' } = input;

      if (!specification || typeof specification !== 'string') {
        throw new Error('specification field is required and must be a string');
      }

      if (specification.trim().length === 0) {
        throw new Error('specification cannot be empty');
      }

      const supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'go', 'rust'];
      if (!supportedLanguages.includes(language.toLowerCase())) {
        throw new Error(`Unsupported language. Supported: ${supportedLanguages.join(', ')}`);
      }

      const supportedTypes = ['function', 'class', 'module', 'test', 'api'];
      if (!supportedTypes.includes(type.toLowerCase())) {
        throw new Error(`Unsupported type. Supported: ${supportedTypes.join(', ')}`);
      }

      try {
        // Create a detailed system prompt for the specific language and type
        const systemPrompt = `You are an expert ${language} developer. Generate a ${type} that implements the following specification:

${specification}

Write clean, production-ready code with proper error handling and documentation.`;

        runtime?.reportProgress({
          phase: 'generate',
          current: 2,
          total: 4,
          message: `Generating ${language} ${type}`
        });
        const code = await llm.generate(systemPrompt, specification, { runtime });

        // Validate that code was generated
        if (!code || code.trim().length === 0) {
          throw new Error('LLM did not generate any code');
        }

        runtime?.reportProgress({
          phase: 'finalize',
          current: 3,
          total: 4,
          message: 'Packaging generated code output'
        });

        return {
          success: true,
          language: language,
          type: type,
          code: code.trim(),
          lineCount: code.split('\n').length,
          characterCount: code.length
        };
      } catch (error) {
        throw new Error(`CodeGeneratorTool execution failed: ${error.message}`);
      }
    }
  });
}

export const codeGeneratorTool = createCodeGeneratorTool();
