import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from './validation';

function createMockReq(overrides = {}): any {
  return { body: {}, query: {}, params: {}, ...overrides };
}

function createMockRes(): any {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const createNext = () => vi.fn();

const testSchema = z.object({
  name: z.string(),
  age: z.number(),
});

describe('validateBody', () => {
  it('passes valid data, calls next, and replaces req.body with parsed data', () => {
    const middleware = validateBody(testSchema);
    const req = createMockReq({ body: { name: 'Alice', age: 30 } });
    const res = createMockRes();
    const next = createNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'Alice', age: 30 });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects invalid data with 400 and error details', () => {
    const middleware = validateBody(testSchema);
    const req = createMockReq({ body: { name: 123, age: 'not-a-number' } });
    const res = createMockRes();
    const next = createNext();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: expect.any(String), message: expect.any(String) }),
        ]),
      })
    );
  });

  it('returns 500 when schema.safeParse throws an unexpected error', () => {
    const throwingSchema = {
      safeParse: vi.fn().mockImplementation(() => {
        throw new Error('unexpected');
      }),
    } as unknown as z.ZodSchema;

    const middleware = validateBody(throwingSchema);
    const req = createMockReq({ body: { name: 'Alice', age: 30 } });
    const res = createMockRes();
    const next = createNext();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Validation error' });
  });
});

describe('validateQuery', () => {
  it('passes valid query params, calls next, and replaces req.query with parsed data', () => {
    const middleware = validateQuery(testSchema);
    const req = createMockReq({ query: { name: 'Bob', age: 25 } });
    const res = createMockRes();
    const next = createNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query).toEqual({ name: 'Bob', age: 25 });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects invalid query params with 400', () => {
    const middleware = validateQuery(testSchema);
    const req = createMockReq({ query: { name: 42 } });
    const res = createMockRes();
    const next = createNext();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Query validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: expect.any(String), message: expect.any(String) }),
        ]),
      })
    );
  });
});

describe('validateParams', () => {
  it('passes valid params, calls next, and replaces req.params with parsed data', () => {
    const middleware = validateParams(testSchema);
    const req = createMockReq({ params: { name: 'Charlie', age: 40 } });
    const res = createMockRes();
    const next = createNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.params).toEqual({ name: 'Charlie', age: 40 });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects invalid params with 400', () => {
    const middleware = validateParams(testSchema);
    const req = createMockReq({ params: { age: 'not-a-number' } });
    const res = createMockRes();
    const next = createNext();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Parameter validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: expect.any(String), message: expect.any(String) }),
        ]),
      })
    );
  });
});
