import { Tool } from '../types/Tool.js';

/**
 * APIBuilderTool
 * 
 * Generates API specifications, endpoint definitions, and schemas.
 * Can produce OpenAPI/Swagger specs, route definitions, and documentation.
 */
export function createAPIBuilderTool() {
  return new Tool({
    id: 'tool.api-builder',
    name: 'API Builder',
    description: 'Generates API specifications, endpoints, and schema definitions from requirements',
    prompt: `You are an expert API architect. Your task is to design clean, scalable APIs that follow industry best practices. Follow these guidelines:

1. Follow REST conventions (GET, POST, PUT, DELETE, PATCH)
2. Use appropriate HTTP status codes
3. Include proper request/response schemas
4. Add error handling specifications
5. Include authentication/authorization details if needed
6. Provide clear endpoint descriptions
7. Ensure the API is versioned appropriately
8. Include pagination for list endpoints
9. Add rate limiting considerations
10. Provide example requests and responses

Generate only the API specification without any explanatory text.`,
    
    keywords: ['api', 'endpoint', 'rest', 'route', 'schema', 'openapi', 'swagger'],
    
    metadata: {
      category: 'api',
      version: '1.0.0',
      tags: ['api-design', 'rest', 'openapi', 'specification']
    },

    prepareInput: async (input) => {
      if (typeof input === 'string') {
        return {
          requirements: input,
          format: 'openapi',
          version: '1.0.0'
        };
      }

      return input;
    },

    run: async (input, llm, runtime) => {
      runtime?.reportProgress({
        phase: 'validate',
        current: 1,
        total: 4,
        message: 'Validating API builder input'
      });

      // Input validation
      if (!input || typeof input !== 'object') {
        throw new Error('APIBuilderTool expects an object with requirements and format');
      }

      const { requirements, format = 'openapi', version = '1.0.0' } = input;

      if (!requirements || typeof requirements !== 'string') {
        throw new Error('requirements field is required and must be a string');
      }

      if (requirements.trim().length === 0) {
        throw new Error('requirements cannot be empty');
      }

      const supportedFormats = ['openapi', 'jsonapi', 'graphql', 'rest'];
      if (!supportedFormats.includes(format.toLowerCase())) {
        throw new Error(`Unsupported format. Supported: ${supportedFormats.join(', ')}`);
      }

      try {
        // Create a detailed prompt for the specific format
        let formatInstructions = '';
        
        if (format.toLowerCase() === 'openapi') {
          formatInstructions = `Generate an OpenAPI 3.0 specification (YAML or JSON format) for:`;
        } else if (format.toLowerCase() === 'graphql') {
          formatInstructions = `Generate a GraphQL schema for:`;
        } else {
          formatInstructions = `Generate a REST API specification for:`;
        }

        const systemPrompt = `You are an expert API architect specializing in ${format} specifications. ${formatInstructions}

${requirements}

Version: ${version}

Design a complete, production-ready API specification with all necessary endpoints, schemas, and documentation.`;

        runtime?.reportProgress({
          phase: 'generate',
          current: 2,
          total: 4,
          message: `Generating ${format} API specification`
        });
        const specification = await llm.generate(systemPrompt, requirements, { runtime });

        // Validate that specification was generated
        if (!specification || specification.trim().length === 0) {
          throw new Error('LLM did not generate any API specification');
        }

        runtime?.reportProgress({
          phase: 'finalize',
          current: 3,
          total: 4,
          message: 'Analyzing generated API specification'
        });

        // Count endpoints/types for metadata
        const endpointCount = (specification.match(/\/\w+/g) || []).length;
        const schemaCount = (specification.match(/schema|type|model/gi) || []).length;

        return {
          success: true,
          format: format,
          version: version,
          specification: specification.trim(),
          metadata: {
            estimatedEndpoints: endpointCount,
            estimatedSchemas: schemaCount,
            lineCount: specification.split('\n').length,
            characterCount: specification.length
          }
        };
      } catch (error) {
        throw new Error(`APIBuilderTool execution failed: ${error.message}`);
      }
    }
  });
}

export const apiBuilderTool = createAPIBuilderTool();
