/**
 * LLMWrapper
 *
 * Provides a unified interface for LLM interactions.
 * Supports Groq (primary), OpenAI, Anthropic, and a structured mock fallback.
 *
 * Provider auto-selection priority:
 *   1. Explicit config.provider
 *   2. GROQ_API_KEY env → groq
 *   3. OPENAI_API_KEY env → openai
 *   4. ANTHROPIC_API_KEY env → anthropic
 *   5. mock (structured fallback)
 */

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export class LLMWrapper {
  /**
   * @param {Object} config
   * @param {string} [config.provider]
   * @param {string} [config.apiKey]
   * @param {string} [config.model]
   * @param {number} [config.temperature]
   * @param {number} [config.maxTokens]
   * @param {string} [config.baseUrl]
   * @param {number} [config.timeoutMs]
   * @param {number} [config.retryCount]
   * @param {Object} [config.defaultHeaders]
   * @param {Object} [config.adapter]
   */
  constructor(config = {}) {
    this.provider = config.provider || detectProvider();
    this.apiKey = config.apiKey || resolveApiKey(this.provider);
    this.model = config.model || resolveModel(this.provider);
    this.temperature = config.temperature ?? 0.3;
    this.maxTokens = config.maxTokens ?? 4096;
    this.baseUrl = config.baseUrl || null;
    this.timeoutMs = config.timeoutMs ?? 45000;
    this.retryCount = config.retryCount ?? 2;
    this.defaultHeaders = config.defaultHeaders || {};
    this.adapter = config.adapter || null;
    this.requestCount = 0;
    this.tokenUsage = { prompt: 0, completion: 0 };
    this.lastError = null;
  }

  /**
   * Generates text based on a prompt
   * @param {string} systemPrompt - System instructions for the LLM
   * @param {string} userPrompt - User input/request
   * @param {Object} [options] - Runtime options
   * @returns {Promise<string>} The generated text
   */
  async generate(systemPrompt, userPrompt, options = {}) {
    const runtime = options.runtime || null;
    this.requestCount++;

    runtime?.reportProgress({
      phase: 'llm.request',
      current: 1,
      total: 2,
      message: `Sending prompt to ${this.provider} (${this.model})`,
    });

    let response = null;

    if (this.provider === 'mock') {
      response = await this._mockGenerate(systemPrompt, userPrompt);
      this._recordApproximateUsage(systemPrompt, userPrompt, response);
    } else if (this.adapter && typeof this.adapter.generate === 'function') {
      response = await this.adapter.generate({
        provider: this.provider,
        apiKey: this.apiKey,
        model: this.model,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        systemPrompt,
        userPrompt,
        runtime,
      });
    } else if (this.provider === 'groq') {
      response = await this._groqGenerate(systemPrompt, userPrompt);
    } else if (this.provider === 'openai') {
      response = await this._openaiGenerate(systemPrompt, userPrompt);
    } else if (this.provider === 'anthropic') {
      response = await this._anthropicGenerate(systemPrompt, userPrompt);
    } else {
      throw new Error(`LLM provider '${this.provider}' is not implemented`);
    }

    runtime?.reportProgress({
      phase: 'llm.response',
      current: 2,
      total: 2,
      message: `Received response from ${this.provider}`,
    });

    return response;
  }

  /**
   * Analyzes text and returns structured data
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @param {string} format - 'json' | 'text'
   * @param {Object} [options]
   * @returns {Promise<*>}
   */
  async analyze(systemPrompt, userPrompt, format = 'text', options = {}) {
    const response = await this.generate(systemPrompt, userPrompt, options);

    if (format === 'json') {
      try {
        return JSON.parse(response);
      } catch (parseError) {
        throw new Error(`Failed to parse LLM response as JSON: ${parseError.message}`);
      }
    }

    return response;
  }

  /**
   * Summarizes text to a target length
   * @param {string} text
   * @param {number} [maxWords]
   * @param {Object} [options]
   * @returns {Promise<string>}
   */
  async summarize(text, maxWords = 100, options = {}) {
    const systemPrompt = `You are a concise summarizer. Summarize the following text in approximately ${maxWords} words. Return only the summary, no additional text.`;
    return this.generate(systemPrompt, text, options);
  }

  /**
   * Extracts key information from text
   * @param {string} text
   * @param {string[]} keys
   * @param {Object} [options]
   * @returns {Promise<Object>}
   */
  async extract(text, keys, options = {}) {
    const systemPrompt = `Extract the following information from the text: ${keys.join(', ')}. Return as a JSON object with these exact keys.`;
    return this.analyze(systemPrompt, text, 'json', options);
  }

  /**
   * Gets usage statistics
   * @returns {Object}
   */
  getUsage() {
    return {
      requestCount: this.requestCount,
      tokenUsage: this.tokenUsage,
      provider: this.provider,
      model: this.model,
      lastError: this.lastError,
    };
  }

  /**
   * Resets usage counters
   */
  resetUsage() {
    this.requestCount = 0;
    this.tokenUsage = { prompt: 0, completion: 0 };
    this.lastError = null;
  }

  // ─── Groq Provider ────────────────────────────────────────────────────

  async _groqGenerate(systemPrompt, userPrompt) {
    const apiKey = this.apiKey || process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("LLM provider 'groq' requires a GROQ_API_KEY");
    }

    const wantsJson = looksLikeJsonRequest(systemPrompt);

    const body = {
      model: this.model,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    };

    if (wantsJson) {
      body.response_format = { type: 'json_object' };
    }

    const payload = await this._requestJsonWithRetry({
      url: this.baseUrl || GROQ_BASE_URL,
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
      body,
    });

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('Groq response did not include message content');
    }

    this._recordUsage(payload.usage);
    return content.trim();
  }

  // ─── OpenAI Provider ──────────────────────────────────────────────────

  async _openaiGenerate(systemPrompt, userPrompt) {
    const apiKey = this.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("LLM provider 'openai' requires an API key");
    }

    const payload = await this._requestJsonWithRetry({
      url: this.baseUrl || 'https://api.openai.com/v1/chat/completions',
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
      body: {
        model: this.model,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      },
    });

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('OpenAI response did not include message content');
    }

    this._recordUsage(payload.usage);
    return content.trim();
  }

  // ─── Anthropic Provider ───────────────────────────────────────────────

  async _anthropicGenerate(systemPrompt, userPrompt) {
    const apiKey = this.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("LLM provider 'anthropic' requires an API key");
    }

    const payload = await this._requestJsonWithRetry({
      url: this.baseUrl || 'https://api.anthropic.com/v1/messages',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model: this.model,
        system: systemPrompt,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      },
    });

    const content = Array.isArray(payload?.content)
      ? payload.content
          .filter(entry => entry.type === 'text')
          .map(entry => entry.text)
          .join('\n')
      : '';

    if (!content.trim()) {
      throw new Error('Anthropic response did not include text content');
    }

    this._recordUsage({
      prompt_tokens: payload?.usage?.input_tokens,
      completion_tokens: payload?.usage?.output_tokens,
    });

    return content.trim();
  }

  // ─── Structured Mock Fallback ─────────────────────────────────────────

  /**
   * Production-quality mock that returns structured JSON when the system
   * prompt requests JSON, and realistic text otherwise.
   * @private
   */
  async _mockGenerate(systemPrompt, userPrompt) {
    await new Promise(resolve => setTimeout(resolve, 80 + Math.random() * 120));

    // Orchestration planner expects strict JSON
    if (systemPrompt.includes('orchestration planner') || systemPrompt.includes('strict JSON')) {
      return buildMockOrchestrationPlan(userPrompt);
    }

    if (systemPrompt.includes('summarize') || systemPrompt.includes('summary')) {
      const inputText = typeof userPrompt === 'string' ? userPrompt : JSON.stringify(userPrompt);
      const words = inputText.split(/\s+/).slice(0, 30).join(' ');
      return `${words}. This summary captures the key points of the input, highlighting the main objectives and requirements identified in the original request.`;
    }

    if (systemPrompt.includes('code') || systemPrompt.includes('generate')) {
      return `// Generated code based on the specification\n// Task: ${truncateForMock(userPrompt, 80)}\n\nexport function execute(input) {\n  const result = processInput(input);\n  return { success: true, data: result };\n}\n\nfunction processInput(input) {\n  return typeof input === 'string' ? { text: input } : input;\n}`;
    }

    if (systemPrompt.includes('API') || systemPrompt.includes('endpoint')) {
      return JSON.stringify({
        endpoints: [
          { path: '/api/v1/resource', method: 'GET', description: 'List resources' },
          { path: '/api/v1/resource', method: 'POST', description: 'Create resource' },
          { path: '/api/v1/resource/:id', method: 'GET', description: 'Get resource by ID' },
        ],
        authentication: 'Bearer token',
        rateLimit: '100 requests per minute',
      }, null, 2);
    }

    if (systemPrompt.includes('security') || systemPrompt.includes('audit')) {
      return JSON.stringify({
        findings: [
          { severity: 'medium', category: 'input-validation', description: 'Ensure all user inputs are sanitized', recommendation: 'Use parameterized queries and input validation schemas' },
          { severity: 'low', category: 'headers', description: 'Add security headers', recommendation: 'Enable HSTS, CSP, X-Frame-Options' },
        ],
        overallRisk: 'low',
        summary: 'The system follows good security practices with minor improvements recommended.',
      }, null, 2);
    }

    if (systemPrompt.includes('test') || systemPrompt.includes('spec')) {
      return `// Test suite generated for the specification\nimport { describe, it, expect } from 'vitest';\n\ndescribe('Feature', () => {\n  it('should handle valid input correctly', () => {\n    const result = processInput({ valid: true });\n    expect(result.success).toBe(true);\n  });\n\n  it('should reject invalid input', () => {\n    expect(() => processInput(null)).toThrow();\n  });\n});`;
    }

    if (systemPrompt.includes('Extract') && systemPrompt.includes('JSON')) {
      try {
        const keys = systemPrompt.match(/: ([\w, ]+)\./)?.[1]?.split(', ') || ['result'];
        const result = {};
        for (const key of keys) {
          result[key.trim()] = `Extracted value for ${key.trim()}`;
        }
        return JSON.stringify(result);
      } catch {
        return JSON.stringify({ result: 'Extracted content from the provided text.' });
      }
    }

    // Default: return a useful mock response
    return `Analysis of the provided input:\n\n${truncateForMock(userPrompt, 120)}\n\nThe system has processed this request and identified the key requirements. The recommended approach involves structured execution of the identified steps with appropriate validation at each stage.`;
  }

  // ─── HTTP with Retry ──────────────────────────────────────────────────

  async _requestJsonWithRetry({ url, headers, body }) {
    let lastError = null;

    for (let attempt = 0; attempt <= this.retryCount; attempt += 1) {
      try {
        return await this._requestJson({ url, headers, body });
      } catch (error) {
        lastError = error;
        this.lastError = error.message;

        const isRetryable =
          error.message.includes('429') ||
          error.message.includes('500') ||
          error.message.includes('502') ||
          error.message.includes('503') ||
          error.message.includes('timed out');

        if (!isRetryable || attempt >= this.retryCount) {
          throw error;
        }

        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    throw lastError;
  }

  async _requestJson({ url, headers = {}, body }) {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.defaultHeaders,
          ...headers,
        },
        body: JSON.stringify(body),
        signal: abortController.signal,
      });

      const raw = await response.text();
      let payload = {};

      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        payload = { raw };
      }

      if (!response.ok) {
        const message = payload?.error?.message || payload?.message || `HTTP ${response.status}`;
        throw new Error(message);
      }

      return payload;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`LLM request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  _recordUsage(usage = {}) {
    const promptTokens = Number(usage.prompt_tokens || usage.promptTokens || 0);
    const completionTokens = Number(usage.completion_tokens || usage.completionTokens || 0);

    this.tokenUsage.prompt += Number.isFinite(promptTokens) ? promptTokens : 0;
    this.tokenUsage.completion += Number.isFinite(completionTokens) ? completionTokens : 0;
  }

  _recordApproximateUsage(systemPrompt, userPrompt, completion) {
    this._recordUsage({
      prompt_tokens: estimateTokens(`${systemPrompt}\n${userPrompt}`),
      completion_tokens: estimateTokens(completion),
    });
  }
}

// ─── Provider Auto-Detection ──────────────────────────────────────────────

function detectProvider() {
  if (process.env.GROQ_API_KEY) return 'groq';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  return 'mock';
}

function resolveApiKey(provider) {
  if (provider === 'groq') return process.env.GROQ_API_KEY || null;
  if (provider === 'openai') return process.env.OPENAI_API_KEY || null;
  if (provider === 'anthropic') return process.env.ANTHROPIC_API_KEY || null;
  return null;
}

function resolveModel(provider) {
  if (provider === 'groq') return GROQ_DEFAULT_MODEL;
  if (provider === 'openai') return 'gpt-4';
  if (provider === 'anthropic') return 'claude-sonnet-4-20250514';
  return 'mock';
}

function looksLikeJsonRequest(systemPrompt) {
  return /\bjson\b/i.test(systemPrompt) || /\bstrict json\b/i.test(systemPrompt);
}

// ─── Mock Helpers ─────────────────────────────────────────────────────────

function buildMockOrchestrationPlan(userPrompt) {
  let taskText = '';
  try {
    const parsed = JSON.parse(userPrompt);
    taskText = parsed.task || userPrompt;
  } catch {
    taskText = userPrompt;
  }

  const goal = typeof taskText === 'string'
    ? taskText.trim().substring(0, 200)
    : 'Execute the requested task';

  const categories = inferCategoriesFromTask(goal);
  const steps = categories.slice(0, 4).map((category, index) => ({
    title: `${capitalize(category)} execution step`,
    objective: `Apply ${category} capabilities to: ${goal.substring(0, 100)}`,
    capabilityCategory: category,
    requiresApproval: index === categories.length - 1 && /approve|review|manual/i.test(goal),
  }));

  if (steps.length === 0) {
    steps.push({
      title: 'General task execution',
      objective: goal,
      capabilityCategory: 'general',
      requiresApproval: false,
    });
  }

  return JSON.stringify({
    goal,
    capabilityCategories: categories.length > 0 ? categories : ['general'],
    suggestedExecutionSteps: steps,
    branchPoints: [],
    confidence: 0.42,
    constraints: [],
  });
}

function inferCategoriesFromTask(task) {
  const lower = task.toLowerCase();
  const categories = [];

  if (/code|typescript|javascript|program|function|class|module|refactor|bug/i.test(lower)) categories.push('code');
  if (/api|endpoint|route|rest|graphql|swagger/i.test(lower)) categories.push('api');
  if (/summar|text|write|content|document|article|copy/i.test(lower)) categories.push('text');
  if (/data|analyz|database|sql|query|csv|dataset/i.test(lower)) categories.push('data');
  if (/security|audit|vulnerab|pentest|auth|encrypt/i.test(lower)) categories.push('security');
  if (/test|spec|unit|integration|e2e|coverage/i.test(lower)) categories.push('testing');
  if (/deploy|ci|cd|devops|docker|kubernetes|pipeline/i.test(lower)) categories.push('devops');
  if (/architect|design|system|scale|infra/i.test(lower)) categories.push('architecture');
  if (/debug|error|fix|diagnos|troubleshoot/i.test(lower)) categories.push('debugging');
  if (/plan|task|project|roadmap|milestone/i.test(lower)) categories.push('planning');
  if (/translat|language|i18n/i.test(lower)) categories.push('text');
  if (/perform|optimi|profile|speed|latency/i.test(lower)) categories.push('analysis');
  if (/schema|valid|format|json|yaml/i.test(lower)) categories.push('data');
  if (/complian|gdpr|hipaa|standard|regulat/i.test(lower)) categories.push('security');

  return [...new Set(categories)].slice(0, 6);
}

function capitalize(value) {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function truncateForMock(value, maxLength) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// ─── Default Singleton ────────────────────────────────────────────────────

/**
 * Default singleton instance.
 * Auto-detects provider from environment:
 *   GROQ_API_KEY → groq (llama-3.3-70b-versatile)
 *   OPENAI_API_KEY → openai (gpt-4)
 *   ANTHROPIC_API_KEY → anthropic (claude-sonnet)
 *   fallback → structured mock
 */
export const defaultLLM = new LLMWrapper();

function estimateTokens(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return 0;
  }

  return Math.max(1, Math.ceil(value.length / 4));
}
