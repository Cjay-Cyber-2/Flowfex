/**
 * LLMWrapper
 * 
 * Provides a unified interface for LLM interactions.
 * This abstraction allows tools to use LLM capabilities without 
 * directly depending on a specific LLM provider.
 * 
 * In production, this would connect to OpenAI, Anthropic, or other providers.
 */

export class LLMWrapper {
  /**
   * Creates a new LLM wrapper instance
   * @param {Object} config - Configuration object
   * @param {string} [config.provider] - LLM provider (default: 'mock')
   * @param {string} [config.apiKey] - API key for the provider
   * @param {string} [config.model] - Model identifier
   * @param {number} [config.temperature] - Temperature for generation (0-1)
   * @param {number} [config.maxTokens] - Maximum tokens for generation
   */
  constructor(config = {}) {
    this.provider = config.provider || 'mock';
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 2048;
    this.baseUrl = config.baseUrl || null;
    this.timeoutMs = config.timeoutMs ?? 30000;
    this.defaultHeaders = config.defaultHeaders || {};
    this.adapter = config.adapter || null;
    this.requestCount = 0;
    this.tokenUsage = { prompt: 0, completion: 0 };
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
      message: `Sending prompt to ${this.provider}`
    });

    // Mock implementation for development
    if (this.provider === 'mock') {
      const response = await this._mockGenerate(systemPrompt, userPrompt);
      this._recordApproximateUsage(systemPrompt, userPrompt, response);
      runtime?.reportProgress({
        phase: 'llm.response',
        current: 2,
        total: 2,
        message: `Received response from ${this.provider}`
      });
      return response;
    }

    let response = null;

    if (this.adapter && typeof this.adapter.generate === 'function') {
      response = await this.adapter.generate({
        provider: this.provider,
        apiKey: this.apiKey,
        model: this.model,
        temperature: this.temperature,
        maxTokens: this.maxTokens,
        systemPrompt,
        userPrompt,
        runtime
      });
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
      message: `Received response from ${this.provider}`
    });

    return response;
  }

  /**
   * Analyzes text and returns structured data
   * @param {string} systemPrompt - System instructions
   * @param {string} userPrompt - User input
   * @param {string} format - Expected output format (json, text, etc.)
   * @returns {Promise<*>} Parsed response
   */
  async analyze(systemPrompt, userPrompt, format = 'text', options = {}) {
    const response = await this.generate(systemPrompt, userPrompt, options);

    if (format === 'json') {
      try {
        return JSON.parse(response);
      } catch (e) {
        throw new Error(`Failed to parse LLM response as JSON: ${e.message}`);
      }
    }

    return response;
  }

  /**
   * Summarizes text to a target length
   * @param {string} text - Text to summarize
   * @param {number} [maxWords] - Maximum words in summary
   * @returns {Promise<string>} Summarized text
   */
  async summarize(text, maxWords = 100, options = {}) {
    const systemPrompt = `You are a concise summarizer. Summarize the following text in approximately ${maxWords} words. Return only the summary, no additional text.`;
    return this.generate(systemPrompt, text, options);
  }

  /**
   * Extracts key information from text
   * @param {string} text - Text to extract from
   * @param {string[]} keys - Keys to extract
   * @returns {Promise<Object>} Object with extracted keys
   */
  async extract(text, keys, options = {}) {
    const systemPrompt = `Extract the following information from the text: ${keys.join(', ')}. Return as a JSON object with these exact keys.`;
    return this.analyze(systemPrompt, text, 'json', options);
  }

  /**
   * Gets usage statistics
   * @returns {Object} Usage info
   */
  getUsage() {
    return {
      requestCount: this.requestCount,
      tokenUsage: this.tokenUsage,
      provider: this.provider,
      model: this.model
    };
  }

  /**
   * Resets usage counters
   */
  resetUsage() {
    this.requestCount = 0;
    this.tokenUsage = { prompt: 0, completion: 0 };
  }

  /**
   * Mock implementation for development and testing
   * @private
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @returns {Promise<string>}
   */
  async _mockGenerate(systemPrompt, userPrompt) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock responses based on the prompt content
    if (systemPrompt.includes('summarize') || systemPrompt.includes('summary')) {
      return `Summary: ${userPrompt.substring(0, 50)}...`;
    }

    if (systemPrompt.includes('code') || systemPrompt.includes('generate')) {
      return `Generated code based on: ${userPrompt}`;
    }

    if (systemPrompt.includes('API') || systemPrompt.includes('endpoint')) {
      return JSON.stringify({
        endpoint: '/api/example',
        method: 'POST',
        parameters: ['param1', 'param2']
      });
    }

    // Default mock response
    return `Mock LLM response to: ${userPrompt}`;
  }

  async _openaiGenerate(systemPrompt, userPrompt) {
    const apiKey = this.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("LLM provider 'openai' requires an API key");
    }

    const payload = await this._requestJson({
      url: this.baseUrl || 'https://api.openai.com/v1/chat/completions',
      headers: {
        authorization: `Bearer ${apiKey}`
      },
      body: {
        model: this.model,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }
    });

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('OpenAI response did not include message content');
    }

    this._recordUsage(payload.usage);
    return content.trim();
  }

  async _anthropicGenerate(systemPrompt, userPrompt) {
    const apiKey = this.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("LLM provider 'anthropic' requires an API key");
    }

    const payload = await this._requestJson({
      url: this.baseUrl || 'https://api.anthropic.com/v1/messages',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: {
        model: this.model,
        system: systemPrompt,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        messages: [
          {
            role: 'user',
            content: userPrompt
          }
        ]
      }
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
      completion_tokens: payload?.usage?.output_tokens
    });

    return content.trim();
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
          ...headers
        },
        body: JSON.stringify(body),
        signal: abortController.signal
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
      completion_tokens: estimateTokens(completion)
    });
  }
}

/**
 * Default singleton instance
 * Can be overridden for testing or different configurations
 */
export const defaultLLM = new LLMWrapper({ provider: 'mock' });

function estimateTokens(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return 0;
  }

  return Math.max(1, Math.ceil(value.length / 4));
}
