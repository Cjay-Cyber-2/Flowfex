export class SessionLockManager {
  constructor() {
    this.tails = new Map();
  }

  async runExclusive(sessionId, task) {
    const activeTail = this.tails.get(sessionId) || Promise.resolve();
    let release = () => {};
    const nextTail = new Promise(resolve => {
      release = resolve;
    });

    this.tails.set(sessionId, activeTail.then(() => nextTail));

    await activeTail;

    try {
      return await task();
    } finally {
      release();

      if (this.tails.get(sessionId) === nextTail) {
        this.tails.delete(sessionId);
      }
    }
  }
}

export const defaultSessionLockManager = new SessionLockManager();
