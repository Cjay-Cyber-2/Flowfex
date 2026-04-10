/**
 * Tool Interface Definition
 * 
 * Every tool in Flowfex must conform to this interface.
 * This provides a contract for the orchestration engine.
 */

export class Tool {
  /**
   * Creates a new Tool instance
   * @param {Object} config - Tool configuration
   * @param {string} config.id - Unique identifier for the tool
   * @param {string} config.name - Human-readable name
   * @param {string} config.description - What the tool does
 * @param {string} config.prompt - System prompt/instructions for the tool
 * @param {Function} config.run - Async function: (input, llm, runtime) => Promise<output>
 * @param {Function} [config.prepareInput] - Optional mapper to normalize raw input before run()
   * @param {string[]} [config.keywords] - Keywords for input matching
   * @param {Object} [config.metadata] - Additional metadata
   * @param {string} [config.metadata.category] - Tool category (e.g., 'text', 'code', 'api')
   * @param {string} [config.metadata.version] - Tool version
   * @param {string[]} [config.metadata.tags] - Additional tags for discovery
   */
  constructor(config) {
    const normalizedConfig = {
      ...config,
      name: config?.name || humanizeToolName(config?.id),
      keywords: Array.isArray(config?.keywords) ? config.keywords : [],
      metadata: config?.metadata && typeof config.metadata === 'object' ? config.metadata : {}
    };

    this.validate(normalizedConfig);

    this.id = normalizedConfig.id;
    this.name = normalizedConfig.name;
    this.description = normalizedConfig.description;
    this.prompt = normalizedConfig.prompt;
    this.run = normalizedConfig.run;
    this.prepareInput = normalizedConfig.prepareInput || null;
    this.keywords = normalizedConfig.keywords;
    this.metadata = normalizedConfig.metadata;
    this.createdAt = new Date();
  }

  /**
   * Validates tool configuration
   * @param {Object} config
   * @throws {Error} if validation fails
   */
  validate(config) {
    const required = ['id', 'description', 'prompt', 'run'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Tool validation failed: missing required field '${field}'`);
      }
    }

    if (typeof config.id !== 'string' || !config.id.trim()) {
      throw new Error('Tool validation failed: id must be a non-empty string');
    }

    if (typeof config.name !== 'string' || !config.name.trim()) {
      throw new Error('Tool validation failed: name must be a non-empty string');
    }

    if (typeof config.description !== 'string' || !config.description.trim()) {
      throw new Error('Tool validation failed: description must be a non-empty string');
    }

    if (typeof config.prompt !== 'string' || !config.prompt.trim()) {
      throw new Error('Tool validation failed: prompt must be a non-empty string');
    }

    if (typeof config.run !== 'function') {
      throw new Error('Tool validation failed: run must be a function');
    }

    if (config.prepareInput && typeof config.prepareInput !== 'function') {
      throw new Error('Tool validation failed: prepareInput must be a function');
    }

    if (config.keywords && !Array.isArray(config.keywords)) {
      throw new Error('Tool validation failed: keywords must be an array');
    }
  }

  /**
   * Executes the tool with the given input and LLM instance
   * @param {*} input - The input to process
   * @param {Object} llm - The LLM wrapper instance
   * @param {Object} [runtime] - Execution runtime helpers for progress/status emission
   * @returns {Promise<*>} The output from the tool
   */
  async execute(input, llm, runtime = null) {
    const preparedInput = this.prepareInput
      ? await this.prepareInput(input, {
          llm,
          runtime,
          tool: this
        })
      : input;

    return this.run(preparedInput, llm, runtime);
  }

  /**
   * Serializes the tool to a plain object (excluding run function)
   * Useful for API responses and logging
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      prompt: this.prompt,
      keywords: this.keywords,
      metadata: this.metadata,
      createdAt: this.createdAt
    };
  }
}

function humanizeToolName(id) {
  if (typeof id !== 'string' || !id.trim()) {
    return '';
  }

  return id
    .replace(/\.[^.]+$/, '')
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase())
    .trim();
}
