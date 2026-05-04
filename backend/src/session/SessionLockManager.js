/**
 * In-Memory Session Execution Lock Manager
 * 
 * Prevents concurrent executions on the same session to ensure deterministic
 * graph state changes and prevent corruption from rapid-fire API calls.
 */
export class SessionLockManager {
  constructor() {
    // Map of sessionId -> true
    this.locks = new Map();
  }

  /**
   * Attempts to acquire a lock for the given session ID.
   * Returns true if acquired, false if already locked.
   */
  acquire(sessionId) {
    if (!sessionId) return true; // Can't lock null sessions (e.g. stateless runs)
    
    if (this.locks.has(sessionId)) {
      return false;
    }
    
    this.locks.set(sessionId, true);
    return true;
  }

  /**
   * Releases the lock for the given session ID.
   */
  release(sessionId) {
    if (!sessionId) return;
    this.locks.delete(sessionId);
  }

  /**
   * Checks if a session is currently locked without attempting to acquire it.
   */
  isLocked(sessionId) {
    if (!sessionId) return false;
    return this.locks.has(sessionId);
  }
}

// Global instance
export const sessionLockManager = new SessionLockManager();
