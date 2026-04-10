function cosineSimilarity(left, right) {
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  const length = Math.min(left.length, right.length);

  for (let index = 0; index < length; index++) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

/**
 * Minimal in-memory vector index for Flowfex tool retrieval.
 */
export class MemoryVectorIndex {
  constructor() {
    this.items = new Map();
  }

  upsert(id, vector, payload = {}) {
    this.items.set(id, {
      id,
      vector,
      payload,
      updatedAt: new Date().toISOString()
    });
  }

  remove(id) {
    this.items.delete(id);
  }

  size() {
    return this.items.size;
  }

  query(vector, options = {}) {
    const {
      topK = 5,
      minScore = 0,
      filter
    } = options;

    const matches = [];

    for (const item of this.items.values()) {
      if (typeof filter === 'function' && !filter(item.payload, item)) {
        continue;
      }

      const score = cosineSimilarity(vector, item.vector);
      if (score >= minScore) {
        matches.push({
          id: item.id,
          score,
          payload: item.payload
        });
      }
    }

    return matches
      .sort((left, right) => right.score - left.score)
      .slice(0, topK);
  }
}

export const defaultVectorIndex = new MemoryVectorIndex();
