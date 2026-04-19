/**
 * Simple In-Memory Sliding Window Rate Limiter
 */
export class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // default 1 minute
    this.max = options.max || 60; // default 60 requests
    this.hits = new Map();
    
    // Clean up memory to avoid leaks
    setInterval(() => {
      this.hits.clear();
    }, this.windowMs).unref();
  }

  /**
   * Returns true if request is allowed, false if rate limited.
   * @param {string} ip - The IP address of the requester
   */
  check(ip) {
    if (!ip) return true; 

    const currentHits = this.hits.get(ip) || 0;
    if (currentHits >= this.max) {
      return false; // Limited
    }
    
    this.hits.set(ip, currentHits + 1);
    return true; // Allowed
  }
}

// Default strict limiter for expensive endpoints (e.g. LLM / orchestration execution)
export const executionRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 20 // Max 20 connections/executions per minute per IP to protect LLM quota
});
