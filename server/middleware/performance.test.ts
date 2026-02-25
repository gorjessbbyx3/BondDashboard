import { describe, it, expect, beforeEach } from 'vitest';
import { performanceMonitor } from './performance';

interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: string;
  userAgent?: string;
  ip?: string;
}

function createMetric(overrides: Partial<PerformanceMetrics> = {}): PerformanceMetrics {
  return {
    requestId: Math.random().toString(36).substr(2),
    method: 'GET',
    url: '/api/test',
    statusCode: 200,
    responseTime: 50,
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    ...overrides,
  } as any;
}

describe('PerformanceMonitor', () => {
  it('addMetric: adds a metric that can be retrieved via getMetrics', () => {
    const metric = createMetric({ url: '/api/add-test' });
    performanceMonitor.addMetric(metric);

    const metrics = performanceMonitor.getMetrics(100);
    const found = metrics.find((m: any) => m.requestId === metric.requestId);
    expect(found).toBeDefined();
    expect(found!.url).toBe('/api/add-test');
  });

  it('getMetrics: returns up to the specified limit', () => {
    const tag = Math.random().toString(36).substr(2);
    for (let i = 0; i < 10; i++) {
      performanceMonitor.addMetric(createMetric({ url: `/api/limit-test-${tag}` }));
    }

    const metrics = performanceMonitor.getMetrics(5);
    expect(metrics.length).toBeLessThanOrEqual(5);
  });

  it('getMetrics: default limit is 50', () => {
    const tag = Math.random().toString(36).substr(2);
    for (let i = 0; i < 60; i++) {
      performanceMonitor.addMetric(createMetric({ url: `/api/default-limit-${tag}` }));
    }

    const metrics = performanceMonitor.getMetrics();
    expect(metrics.length).toBeLessThanOrEqual(50);
  });

  it('getAverageResponseTime: calculates correct average', () => {
    const tag = Math.random().toString(36).substr(2);
    performanceMonitor.addMetric(createMetric({ url: `/api/avg-${tag}`, responseTime: 100 }));
    performanceMonitor.addMetric(createMetric({ url: `/api/avg-${tag}`, responseTime: 200 }));
    performanceMonitor.addMetric(createMetric({ url: `/api/avg-${tag}`, responseTime: 300 }));

    const avg = performanceMonitor.getAverageResponseTime(5);
    expect(avg).toBeGreaterThan(0);
    expect(typeof avg).toBe('number');
  });

  it('getAverageResponseTime: returns 0 when no recent metrics', () => {
    const avg = performanceMonitor.getAverageResponseTime(0);
    expect(avg).toBe(0);
  });

  it('getSlowRequests: returns only requests above threshold', () => {
    const tag = Math.random().toString(36).substr(2);
    performanceMonitor.addMetric(createMetric({ url: `/api/slow-${tag}`, responseTime: 50 }));
    performanceMonitor.addMetric(createMetric({ url: `/api/slow-${tag}`, responseTime: 500 }));
    performanceMonitor.addMetric(createMetric({ url: `/api/slow-${tag}`, responseTime: 1500 }));
    performanceMonitor.addMetric(createMetric({ url: `/api/slow-${tag}`, responseTime: 2000 }));

    const slow = performanceMonitor.getSlowRequests(400);
    const relevantSlow = slow.filter((m: any) => m.url.includes(tag));
    expect(relevantSlow.length).toBe(3);
    relevantSlow.forEach((m: any) => {
      expect(m.responseTime).toBeGreaterThan(400);
    });
  });

  it('getSlowRequests: default threshold is 1000ms', () => {
    const tag = Math.random().toString(36).substr(2);
    performanceMonitor.addMetric(createMetric({ url: `/api/default-slow-${tag}`, responseTime: 500 }));
    performanceMonitor.addMetric(createMetric({ url: `/api/default-slow-${tag}`, responseTime: 999 }));
    performanceMonitor.addMetric(createMetric({ url: `/api/default-slow-${tag}`, responseTime: 1001 }));
    performanceMonitor.addMetric(createMetric({ url: `/api/default-slow-${tag}`, responseTime: 2000 }));

    const slow = performanceMonitor.getSlowRequests();
    const relevantSlow = slow.filter((m: any) => m.url.includes(tag));
    expect(relevantSlow.length).toBe(2);
    relevantSlow.forEach((m: any) => {
      expect(m.responseTime).toBeGreaterThan(1000);
    });
  });

  it('getErrorRate: calculates percentage of errors correctly', () => {
    const tag = Math.random().toString(36).substr(2);
    for (let i = 0; i < 8; i++) {
      performanceMonitor.addMetric(createMetric({ url: `/api/error-rate-${tag}`, statusCode: 200 }));
    }
    for (let i = 0; i < 2; i++) {
      performanceMonitor.addMetric(createMetric({ url: `/api/error-rate-${tag}`, statusCode: 500 }));
    }

    const errorRate = performanceMonitor.getErrorRate(5);
    expect(typeof errorRate).toBe('number');
    expect(errorRate).toBeGreaterThan(0);
  });

  it('getErrorRate: returns 0 when no recent metrics', () => {
    const errorRate = performanceMonitor.getErrorRate(0);
    expect(errorRate).toBe(0);
  });

  it('getStats: returns comprehensive stats object with expected shape', () => {
    performanceMonitor.addMetric(createMetric({ url: '/api/stats-test' }));

    const stats = performanceMonitor.getStats();
    expect(stats).toBeDefined();
    expect(typeof stats).toBe('object');
    expect(stats).toHaveProperty('totalRequests');
    expect(stats).toHaveProperty('requestsLast5Min');
    expect(stats).toHaveProperty('requestsLastHour');
    expect(stats).toHaveProperty('averageResponseTime5Min');
    expect(stats).toHaveProperty('averageResponseTime1Hour');
    expect(stats).toHaveProperty('errorRate5Min');
    expect(stats).toHaveProperty('errorRate1Hour');
    expect(stats).toHaveProperty('slowRequests');
    expect(stats).toHaveProperty('memoryUsage');
    expect(typeof stats.totalRequests).toBe('number');
    expect(typeof stats.averageResponseTime5Min).toBe('number');
    expect(typeof stats.errorRate5Min).toBe('number');
  });
});
