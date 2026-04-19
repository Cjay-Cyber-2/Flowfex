export class ControlError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ControlError';
    this.code = options.code || 'control_error';
    this.statusCode = options.statusCode || 400;
    this.retryable = options.retryable === true;
    this.details = options.details || null;
  }
}

export function createControlError(message, options = {}) {
  return new ControlError(message, options);
}

export function toControlError(error, fallback = {}) {
  if (error instanceof ControlError) {
    return error;
  }

  return new ControlError(
    error instanceof Error ? error.message : String(error),
    {
      code: fallback.code || 'control_internal_error',
      statusCode: fallback.statusCode || 500,
      retryable: fallback.retryable === true,
      details: fallback.details || null,
    }
  );
}
