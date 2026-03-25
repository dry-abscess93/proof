import type { ProofAPIErrorBody } from './types';

export class CronozenError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CronozenError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static fromResponse(status: number, body: ProofAPIErrorBody): CronozenError {
    const { code, message, details } = body.error;

    switch (code) {
      case 'UNAUTHORIZED':
        return new AuthenticationError(message, details);
      case 'FORBIDDEN':
        return new ForbiddenError(message, details);
      case 'NOT_FOUND':
        return new NotFoundError(message, details);
      case 'CONFLICT':
        return new ConflictError(message, details);
      case 'VALIDATION_ERROR':
        return new ValidationError(message, details);
      case 'BAD_REQUEST':
        return new BadRequestError(message, details);
      case 'RATE_LIMIT':
        return new RateLimitError(message, details);
      default:
        return new CronozenError(message, code, status, details);
    }
  }
}

export class AuthenticationError extends CronozenError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'UNAUTHORIZED', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends CronozenError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'FORBIDDEN', 403, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends CronozenError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends CronozenError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      message || 'Decision is already sealed and cannot be approved again.',
      'CONFLICT',
      409,
      details,
    );
    this.name = 'ConflictError';
  }
}

export class ValidationError extends CronozenError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 422, details);
    this.name = 'ValidationError';
  }
}

export class BadRequestError extends CronozenError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'BAD_REQUEST', 400, details);
    this.name = 'BadRequestError';
  }
}

export class RateLimitError extends CronozenError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(
      message || 'Rate limit exceeded. Please retry after a short delay.',
      'RATE_LIMIT',
      429,
      details,
    );
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends CronozenError {
  constructor(timeoutMs: number) {
    super(
      `Request timed out after ${timeoutMs}ms`,
      'TIMEOUT',
      0,
    );
    this.name = 'TimeoutError';
  }
}

export class NetworkError extends CronozenError {
  constructor(message: string) {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkError';
  }
}
