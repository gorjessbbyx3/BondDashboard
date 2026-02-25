import { describe, it, expect } from 'vitest';
import { mapApiErrorToContext } from '@/hooks/useErrorContext';

describe('mapApiErrorToContext', () => {
  it('maps a string error to GENERIC_ERROR with the string as the message', () => {
    const result = mapApiErrorToContext('Something went wrong');
    expect(result.code).toBe('GENERIC_ERROR');
    expect(result.message).toBe('Something went wrong');
  });

  it('uses apiError.message and defaults code to NETWORK_ERROR', () => {
    const result = mapApiErrorToContext({ message: 'Connection refused' });
    expect(result.message).toBe('Connection refused');
    expect(result.code).toBe('NETWORK_ERROR');
  });

  it('uses response.data.message when present', () => {
    const apiError = {
      response: {
        status: 400,
        data: { message: 'Bad request payload' },
      },
    };
    const result = mapApiErrorToContext(apiError);
    expect(result.message).toBe('Bad request payload');
  });

  it('returns UNKNOWN_ERROR for unrecognized error shapes', () => {
    const result = mapApiErrorToContext(42);
    expect(result.message).toBe('An unexpected error occurred');
    expect(result.code).toBe('UNKNOWN_ERROR');
  });

  it('maps 401 status to AUTH_INVALID_CREDENTIALS', () => {
    const apiError = {
      response: {
        status: 401,
        data: { message: 'Invalid password' },
      },
    };
    const result = mapApiErrorToContext(apiError);
    expect(result.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('maps 401 with "session" in message to AUTH_SESSION_EXPIRED', () => {
    const apiError = {
      response: {
        status: 401,
        data: { message: 'Your session has expired' },
      },
    };
    const result = mapApiErrorToContext(apiError);
    expect(result.code).toBe('AUTH_SESSION_EXPIRED');
  });

  it('maps 403 status to AUTH_INSUFFICIENT_PERMISSIONS', () => {
    const apiError = {
      response: {
        status: 403,
        data: { message: 'Forbidden' },
      },
    };
    const result = mapApiErrorToContext(apiError);
    expect(result.code).toBe('AUTH_INSUFFICIENT_PERMISSIONS');
  });

  it('maps 404 with field="clientId" to CLIENT_NOT_FOUND', () => {
    const apiError = {
      response: {
        status: 404,
        data: { message: 'Not found' },
      },
    };
    const result = mapApiErrorToContext(apiError, undefined, 'clientId');
    expect(result.code).toBe('CLIENT_NOT_FOUND');
  });

  it('maps 409 with "duplicate" in message to CLIENT_DUPLICATE_ID', () => {
    const apiError = {
      response: {
        status: 409,
        data: { message: 'Duplicate client entry' },
      },
    };
    const result = mapApiErrorToContext(apiError);
    expect(result.code).toBe('CLIENT_DUPLICATE_ID');
  });

  it('maps 422 status to VALIDATION_ERROR', () => {
    const apiError = {
      response: {
        status: 422,
        data: { message: 'Unprocessable entity' },
      },
    };
    const result = mapApiErrorToContext(apiError);
    expect(result.code).toBe('VALIDATION_ERROR');
  });

  it('maps 500 status to NETWORK_ERROR', () => {
    const apiError = {
      response: {
        status: 500,
        data: { message: 'Internal server error' },
      },
    };
    const result = mapApiErrorToContext(apiError);
    expect(result.code).toBe('NETWORK_ERROR');
  });

  it('adds auth suggestions for /auth/ endpoints', () => {
    const result = mapApiErrorToContext('Login failed', '/api/auth/login');
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions).toContain('Verify your credentials are correct');
    expect(result.suggestions).toContain('Check if your account is active');
  });

  it('adds client suggestions for /client/ endpoints', () => {
    const result = mapApiErrorToContext('Not found', '/api/client/123');
    expect(result.suggestions).toBeDefined();
    expect(result.suggestions).toContain('Ensure the client record exists');
    expect(result.suggestions).toContain('Verify you have permission to access this client');
  });

  it('sets context from endpoint: /auth/ returns "User Authentication"', () => {
    const result = mapApiErrorToContext('error', '/api/auth/login');
    expect(result.context).toBe('User Authentication');
  });

  it('sets severity to "warning" for AUTH_INSUFFICIENT_PERMISSIONS', () => {
    const apiError = {
      response: {
        status: 403,
        data: { message: 'Forbidden' },
      },
    };
    const result = mapApiErrorToContext(apiError);
    expect(result.severity).toBe('warning');
  });

  it('sets severity to "info" for NOT_FOUND codes', () => {
    const apiError = {
      response: {
        status: 404,
        data: { message: 'Client not found' },
      },
    };
    const result = mapApiErrorToContext(apiError, undefined, 'clientId');
    expect(result.code).toBe('CLIENT_NOT_FOUND');
    expect(result.severity).toBe('info');
  });

  it('sets severity to "error" for GENERIC_ERROR', () => {
    const result = mapApiErrorToContext('Something broke');
    expect(result.severity).toBe('error');
  });

  it('sets a timestamp on the result', () => {
    const before = new Date();
    const result = mapApiErrorToContext('test error');
    const after = new Date();
    expect(result.timestamp).toBeInstanceOf(Date);
    expect(result.timestamp!.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.timestamp!.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
