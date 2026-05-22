/**
 * Identity-Aware Sliding Window Rate Limiter
 * 
 * Supports per-IP limiting with different bucket sizes depending on the user tier.
 */
export class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000;
    this.defaultMax = options.defaultMax || 60;
    this.tiers = options.tiers || {};
    this.hits = new Map();
    
    // Clean up memory to avoid leaks
    setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.hits.entries()) {
        if (now - record.timestamp >= this.windowMs) {
          this.hits.delete(key);
        }
      }
    }, this.windowMs).unref();
  }

  /**
   * Returns true if request is allowed, false if rate limited.
   * @param {string} ip - The IP address of the requester
   * @param {string} tier - The user tier ('anonymous', 'authenticated', 'api_key')
   */
  check(ip, tier = 'anonymous') {
    if (!ip) return true; 

    const max = this.tiers[tier] !== undefined ? this.tiers[tier] : this.defaultMax;
    const now = Date.now();
    const record = this.hits.get(ip);

    if (record) {
      if (now - record.timestamp < this.windowMs) {
        if (record.count >= max) {
          return false; // Limited
        }
        record.count++;
        return true; // Allowed
      }
    }
    
    // New or expired record
    this.hits.set(ip, { count: 1, timestamp: now });
    return true; // Allowed
  }

  /**
   * Get remaining requests for the given IP and tier.
   * Useful for headers.
   */
  remaining(ip, tier = 'anonymous') {
    const max = this.tiers[tier] !== undefined ? this.tiers[tier] : this.defaultMax;
    if (!ip) return max;
    
    const record = this.hits.get(ip);
    if (!record) return max;
    
    const now = Date.now();
    if (now - record.timestamp >= this.windowMs) return max;
    
    return Math.max(0, max - record.count);
  }
}

// ─── Route-Specific Limiters ──────────────────────────────────────────────────

// Protects the orchestration execution endpoint
export const executionRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  defaultMax: 10,
  tiers: {
    anonymous: 10,
    authenticated: 20,
    api_key: 30,
  }
});

// Protects session control actions (pause, resume, approve, etc)
export const controlRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  defaultMax: 30,
  tiers: {
    anonymous: 30,
    authenticated: 60,
    api_key: 60,
  }
});

// Protects the initial WebSocket/live connection endpoint
export const connectRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  defaultMax: 8,
  tiers: {
    anonymous: 8,
    authenticated: 15,
    api_key: 20,
  }
});

// Protects API key management endpoints
export const apiKeyRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  defaultMax: 10, // only authenticated users should hit this anyway
});
