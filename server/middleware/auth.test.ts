import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireRole, requireAnyRole } from './auth';

function createMockReq(overrides = {}): any {
  return { session: {}, user: undefined, ...overrides };
}

function createMockRes(): any {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const createNext = () => vi.fn();

describe('requireAuth', () => {
  it('grants access and sets user when adminRole is in session', () => {
    const req = createMockReq({ session: { adminRole: 'admin' } });
    const res = createMockRes();
    const next = createNext();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      id: 'admin-admin',
      role: 'admin',
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('grants access and sets user when clientId is in session', () => {
    const req = createMockReq({ session: { clientId: 'client-42' } });
    const res = createMockRes();
    const next = createNext();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      id: 'client-42',
      role: 'client',
      clientId: 'client-42',
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when session is empty', () => {
    const req = createMockReq({ session: {} });
    const res = createMockRes();
    const next = createNext();

    requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
  });
});

describe('requireRole', () => {
  it('allows access when user.role matches the required role', () => {
    const middleware = requireRole('admin');
    const req = createMockReq({ user: { id: 'admin-admin', role: 'admin' } });
    const res = createMockRes();
    const next = createNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when user.role does not match the required role', () => {
    const middleware = requireRole('admin');
    const req = createMockReq({ user: { id: 'client-1', role: 'client' } });
    const res = createMockRes();
    const next = createNext();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
  });

  it('returns 401 when there is no user on the request', () => {
    const middleware = requireRole('admin');
    const req = createMockReq();
    const res = createMockRes();
    const next = createNext();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
  });
});

describe('requireAnyRole', () => {
  it('allows access when user.role is in the allowed roles array', () => {
    const middleware = requireAnyRole(['admin', 'maintenance']);
    const req = createMockReq({ user: { id: 'admin-admin', role: 'admin' } });
    const res = createMockRes();
    const next = createNext();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when user.role is not in the allowed roles array', () => {
    const middleware = requireAnyRole(['admin', 'maintenance']);
    const req = createMockReq({ user: { id: 'client-1', role: 'client' } });
    const res = createMockRes();
    const next = createNext();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Insufficient permissions' });
  });

  it('returns 401 when there is no user on the request', () => {
    const middleware = requireAnyRole(['admin', 'maintenance']);
    const req = createMockReq();
    const res = createMockRes();
    const next = createNext();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Authentication required' });
  });
});
