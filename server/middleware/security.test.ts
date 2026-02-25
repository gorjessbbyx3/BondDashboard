import { describe, it, expect, vi, beforeEach } from 'vitest';
import { securityHeaders, sanitizeInput, loginRateLimit, apiRateLimit } from './security';

function createMockReq(overrides = {}): any {
  return { body: {}, query: {}, params: {}, ...overrides };
}

function createMockRes(): any {
  const res: any = { headers: {} };
  res.setHeader = vi.fn((key: string, val: string) => { res.headers[key] = val; });
  res.removeHeader = vi.fn((key: string) => { delete res.headers[key]; });
  return res;
}

describe('securityHeaders', () => {
  let req: any;
  let res: any;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    req = createMockReq();
    res = createMockRes();
    next = vi.fn();
  });

  it('sets all 4 security headers', () => {
    securityHeaders(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');

    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(res.headers['X-Frame-Options']).toBe('DENY');
    expect(res.headers['X-XSS-Protection']).toBe('1; mode=block');
    expect(res.headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });

  it('removes X-Powered-By header', () => {
    // Pre-populate the header so we can verify it gets removed
    res.headers['X-Powered-By'] = 'Express';

    securityHeaders(req, res, next);

    expect(res.removeHeader).toHaveBeenCalledWith('X-Powered-By');
    expect(res.headers['X-Powered-By']).toBeUndefined();
  });

  it('calls next()', () => {
    securityHeaders(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('sanitizeInput', () => {
  let res: any;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    res = createMockRes();
    next = vi.fn();
  });

  it('strips <script> tags from body', () => {
    const req = createMockReq({
      body: { name: 'hello<script>alert("xss")</script>world' },
    });

    sanitizeInput(req, res, next);

    expect(req.body.name).toBe('helloworld');
  });

  it('strips javascript: URIs from body', () => {
    const req = createMockReq({
      body: { link: 'javascript:alert(1)' },
    });

    sanitizeInput(req, res, next);

    expect(req.body.link).not.toContain('javascript:');
    expect(req.body.link).toBe('alert(1)');
  });

  it('strips onclick= handlers from body', () => {
    const req = createMockReq({
      body: { html: '<div onclick=doEvil()>click me</div>' },
    });

    sanitizeInput(req, res, next);

    expect(req.body.html).not.toMatch(/onclick\s*=/i);
  });

  it('handles nested objects', () => {
    const req = createMockReq({
      body: {
        level1: {
          level2: {
            payload: '<script>alert("deep")</script>clean',
          },
        },
      },
    });

    sanitizeInput(req, res, next);

    expect(req.body.level1.level2.payload).toBe('clean');
  });

  it('leaves clean strings untouched', () => {
    const req = createMockReq({
      body: { name: 'John Doe', email: 'john@example.com' },
      query: { search: 'bond+rates' },
      params: { id: '12345' },
    });

    sanitizeInput(req, res, next);

    expect(req.body.name).toBe('John Doe');
    expect(req.body.email).toBe('john@example.com');
    expect(req.query.search).toBe('bond+rates');
    expect(req.params.id).toBe('12345');
  });

  it('handles null body/query/params gracefully', () => {
    const req = createMockReq({
      body: null,
      query: null,
      params: null,
    });

    // Should not throw
    expect(() => sanitizeInput(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('documents known bypass - <img src=x onerror=alert(1)> passes through', () => {
    // This documents a known gap in the sanitizer: while on*= attributes
    // are stripped, the <img> tag itself and the src=x part remain.
    // More importantly, the regex only strips the attribute assignment
    // portion, but the overall <img> tag with its payload structure
    // may still get through in certain forms.
    const req = createMockReq({
      body: { payload: '<img src=x onerror=alert(1)>' },
    });

    sanitizeInput(req, res, next);

    // The onerror= part gets stripped by the on\w+\s*= regex, but the
    // <img> tag itself is NOT removed — the sanitizer only targets
    // <script> tags, javascript: URIs, and on*= attributes.
    // The resulting string still contains the <img> tag.
    expect(req.body.payload).toContain('<img');

    // This is the key point: the XSS vector's structural HTML element
    // passes through because the sanitizer does not strip arbitrary HTML
    // tags — only <script> tags specifically.
  });
});

describe('rate limiters', () => {
  it('loginRateLimit exists and is a function', () => {
    expect(loginRateLimit).toBeDefined();
    expect(typeof loginRateLimit).toBe('function');
  });

  it('apiRateLimit exists and is a function', () => {
    expect(apiRateLimit).toBeDefined();
    expect(typeof apiRateLimit).toBe('function');
  });
});
