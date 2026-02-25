import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../storage', () => ({
  storage: {
    getAllClients: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../services/sendgrid', () => ({
  sendGridService: {
    isReady: vi.fn().mockReturnValue(false),
  },
}));

import { healthCheckService, healthCheckMiddleware, healthEndpoint } from './healthCheck';
import { storage } from '../storage';
import { sendGridService } from '../services/sendgrid';

describe('HealthCheckService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (storage.getAllClients as any).mockResolvedValue([]);
    (sendGridService.isReady as any).mockReturnValue(false);
  });

  it('getHealthStatus: returns health status object with correct shape', async () => {
    const status = await healthCheckService.getHealthStatus();

    expect(status).toBeDefined();
    expect(status).toHaveProperty('status');
    expect(status).toHaveProperty('timestamp');
    expect(status).toHaveProperty('version');
    expect(status).toHaveProperty('services');
    expect(status).toHaveProperty('metrics');
    expect(status.services).toHaveProperty('database');
    expect(status.services).toHaveProperty('email');
    expect(status.services).toHaveProperty('storage');
    expect(status.metrics).toHaveProperty('uptime');
    expect(status.metrics).toHaveProperty('memoryUsage');
    expect(status.metrics).toHaveProperty('activeConnections');
  });

  it('getHealthStatus: status is healthy when all services are up', async () => {
    (sendGridService.isReady as any).mockReturnValue(true);
    (storage.getAllClients as any).mockResolvedValue([]);

    const status = await healthCheckService.getHealthStatus();

    expect(status.status).toBe('healthy');
  });

  it('getHealthStatus: status is degraded when email is not configured', async () => {
    (sendGridService.isReady as any).mockReturnValue(false);
    (storage.getAllClients as any).mockResolvedValue([]);

    const status = await healthCheckService.getHealthStatus();

    expect(status.status).toBe('degraded');
  });

  it('getHealthStatus: status is unhealthy when database is down', async () => {
    (storage.getAllClients as any).mockRejectedValue(new Error('Connection refused'));

    const status = await healthCheckService.getHealthStatus();

    expect(status.status).toBe('unhealthy');
  });

  it('incrementConnections/decrementConnections updates activeConnections', async () => {
    const before = await healthCheckService.getHealthStatus();
    const initialConnections = before.metrics.activeConnections;

    healthCheckService.incrementConnections();
    healthCheckService.incrementConnections();
    healthCheckService.incrementConnections();

    const afterIncrement = await healthCheckService.getHealthStatus();
    expect(afterIncrement.metrics.activeConnections).toBe(initialConnections + 3);

    healthCheckService.decrementConnections();

    const afterDecrement = await healthCheckService.getHealthStatus();
    expect(afterDecrement.metrics.activeConnections).toBe(initialConnections + 2);

    // Clean up the remaining connections
    healthCheckService.decrementConnections();
    healthCheckService.decrementConnections();
  });

  it('getHealthStatus: metrics.uptime is a positive number', async () => {
    const status = await healthCheckService.getHealthStatus();

    expect(typeof status.metrics.uptime).toBe('number');
    expect(status.metrics.uptime).toBeGreaterThan(0);
  });

  it('healthEndpoint: returns 200 with health data', async () => {
    const req = {};
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    await healthEndpoint(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: expect.any(String),
        timestamp: expect.any(String),
        version: expect.any(String),
        services: expect.any(Object),
        metrics: expect.any(Object),
      })
    );
  });

  it('healthCheckMiddleware: calls next and tracks connections', async () => {
    const req = {};
    const res = {
      on: vi.fn(),
    };
    const next = vi.fn();

    healthCheckMiddleware(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });
});
