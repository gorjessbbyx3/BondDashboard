import { describe, it, expect, vi, beforeEach } from 'vitest';
import { securityAuditService } from './securityAudit';

// Helper to create a unique IP per test to avoid singleton state leakage
let ipCounter = 0;
function uniqueIP(): string {
  ipCounter += 1;
  return `10.0.${Math.floor(ipCounter / 256)}.${ipCounter % 256}`;
}

// Helper to build a minimal event
function makeEvent(overrides: Record<string, any> = {}) {
  return {
    eventType: 'auth_failure' as const,
    severity: 'medium' as const,
    ip: uniqueIP(),
    userAgent: 'test-agent',
    details: {},
    ...overrides,
  };
}

describe('SecurityAuditService', () => {
  // We do NOT reset the singleton between tests. Each test uses unique IPs
  // so that accumulated state from previous tests does not interfere.

  describe('logSecurityEvent', () => {
    it('adds event with auto-generated id and timestamp', () => {
      const ip = uniqueIP();
      securityAuditService.logSecurityEvent({
        eventType: 'login_attempt',
        severity: 'low',
        ip,
        userAgent: 'test-agent',
        details: { test: true },
      });

      const events = securityAuditService.getSecurityEvents(1000);
      const found = events.find(e => e.ip === ip && e.eventType === 'login_attempt');

      expect(found).toBeDefined();
      expect(found!.id).toMatch(/^sec_/);
      expect(found!.timestamp).toBeTruthy();
      expect(new Date(found!.timestamp).getTime()).not.toBeNaN();
      expect(found!.resolved).toBe(false);
    });

    it('marks IP as suspicious after 5+ failed auth attempts', () => {
      const ip = uniqueIP();

      // The threshold triggers when failedAttempts.get(ip) >= 5, meaning
      // the 6th call (attempts map value reaches 5 after 5 prior increments).
      for (let i = 0; i < 6; i++) {
        securityAuditService.logSecurityEvent({
          eventType: 'auth_failure',
          severity: 'medium',
          ip,
          userAgent: 'brute-force-agent',
          details: { attempt: i + 1 },
        });
      }

      expect(securityAuditService.isIPSuspicious(ip)).toBe(true);
      expect(securityAuditService.getSuspiciousIPs()).toContain(ip);
    });
  });

  describe('getSecurityMetrics', () => {
    it('returns correct counts for time period', () => {
      const ip = uniqueIP();

      // Log one of each relevant type
      securityAuditService.logSecurityEvent({
        eventType: 'auth_failure',
        severity: 'medium',
        ip,
        userAgent: 'test',
        details: {},
      });
      securityAuditService.logSecurityEvent({
        eventType: 'data_access',
        severity: 'low',
        ip,
        userAgent: 'test',
        details: {},
      });
      securityAuditService.logSecurityEvent({
        eventType: 'admin_action',
        severity: 'low',
        ip,
        userAgent: 'test',
        details: {},
      });

      const metrics = securityAuditService.getSecurityMetrics(1);

      // We check >= because the singleton may have events from other tests
      expect(metrics.failedLogins).toBeGreaterThanOrEqual(1);
      expect(metrics.dataAccessAttempts).toBeGreaterThanOrEqual(1);
      expect(metrics.adminActions).toBeGreaterThanOrEqual(1);
      expect(metrics.uniqueIPs).toBeGreaterThanOrEqual(1);
      expect(typeof metrics.riskScore).toBe('number');
    });
  });

  describe('getSecurityEvents', () => {
    it('returns events sorted by timestamp desc', () => {
      const ip1 = uniqueIP();
      const ip2 = uniqueIP();

      securityAuditService.logSecurityEvent({
        eventType: 'login_attempt',
        severity: 'low',
        ip: ip1,
        userAgent: 'test',
        details: { order: 'first' },
      });
      securityAuditService.logSecurityEvent({
        eventType: 'login_attempt',
        severity: 'low',
        ip: ip2,
        userAgent: 'test',
        details: { order: 'second' },
      });

      const events = securityAuditService.getSecurityEvents(1000);

      // Verify descending timestamp order
      for (let i = 1; i < events.length; i++) {
        const tPrev = new Date(events[i - 1].timestamp).getTime();
        const tCurr = new Date(events[i].timestamp).getTime();
        expect(tPrev).toBeGreaterThanOrEqual(tCurr);
      }
    });

    it('filters by severity', () => {
      const ip = uniqueIP();

      securityAuditService.logSecurityEvent({
        eventType: 'suspicious_activity',
        severity: 'critical',
        ip,
        userAgent: 'test',
        details: { filterTest: true },
      });

      const criticalEvents = securityAuditService.getSecurityEvents(1000, 'critical');

      expect(criticalEvents.length).toBeGreaterThanOrEqual(1);
      expect(criticalEvents.every(e => e.severity === 'critical')).toBe(true);
    });
  });

  describe('getSuspiciousIPs', () => {
    it('returns IPs with 5+ failures', () => {
      const ip = uniqueIP();
      const cleanIP = uniqueIP();

      // Push the target IP over the threshold
      for (let i = 0; i < 6; i++) {
        securityAuditService.logSecurityEvent(makeEvent({ ip }));
      }

      // Only 2 failures for the clean IP — should NOT be suspicious
      securityAuditService.logSecurityEvent(makeEvent({ ip: cleanIP }));
      securityAuditService.logSecurityEvent(makeEvent({ ip: cleanIP }));

      const suspicious = securityAuditService.getSuspiciousIPs();
      expect(suspicious).toContain(ip);
      expect(suspicious).not.toContain(cleanIP);
    });
  });

  describe('isIPSuspicious', () => {
    it('returns true for suspicious IPs and false for clean ones', () => {
      const suspiciousIP = uniqueIP();
      const cleanIP = uniqueIP();

      for (let i = 0; i < 6; i++) {
        securityAuditService.logSecurityEvent(makeEvent({ ip: suspiciousIP }));
      }

      expect(securityAuditService.isIPSuspicious(suspiciousIP)).toBe(true);
      expect(securityAuditService.isIPSuspicious(cleanIP)).toBe(false);
    });
  });

  describe('resolveSecurityEvent', () => {
    it('marks event resolved and returns true', () => {
      const ip = uniqueIP();
      securityAuditService.logSecurityEvent({
        eventType: 'suspicious_activity',
        severity: 'high',
        ip,
        userAgent: 'test',
        details: { resolveTest: true },
      });

      // Find the event we just logged
      const events = securityAuditService.getSecurityEvents(1000);
      const target = events.find(e => e.ip === ip && e.details.resolveTest);
      expect(target).toBeDefined();

      const result = securityAuditService.resolveSecurityEvent(target!.id, 'admin-user');

      expect(result).toBe(true);

      // Verify the event is now resolved
      const updatedEvents = securityAuditService.getSecurityEvents(1000);
      const resolved = updatedEvents.find(e => e.id === target!.id);
      expect(resolved!.resolved).toBe(true);
      expect(resolved!.details.resolvedBy).toBe('admin-user');
      expect(resolved!.details.resolvedAt).toBeDefined();
    });

    it('returns false for non-existent event', () => {
      const result = securityAuditService.resolveSecurityEvent('sec_nonexistent_999999', 'admin');
      expect(result).toBe(false);
    });
  });

  describe('clearSuspiciousIP', () => {
    it('removes IP from suspicious list', () => {
      const ip = uniqueIP();

      // Make the IP suspicious
      for (let i = 0; i < 6; i++) {
        securityAuditService.logSecurityEvent(makeEvent({ ip }));
      }
      expect(securityAuditService.isIPSuspicious(ip)).toBe(true);

      // Clear it
      securityAuditService.clearSuspiciousIP(ip);

      expect(securityAuditService.isIPSuspicious(ip)).toBe(false);
      expect(securityAuditService.getSuspiciousIPs()).not.toContain(ip);
    });
  });

  describe('calculateRiskScore via getSecurityMetrics', () => {
    it('scores low=1, medium=3, high=7, critical=15 (plus additional factors)', () => {
      // We cannot isolate calculateRiskScore perfectly because it also adds
      // bonus points for suspicious_activity and auth_failure events.
      // But we can verify the base scoring by logging known-severity events
      // from a unique IP and checking the score is non-trivial.
      const ip = uniqueIP();

      // Log one event of each severity
      securityAuditService.logSecurityEvent({
        eventType: 'login_attempt',
        severity: 'low',
        ip,
        userAgent: 'test',
        details: { scoreTest: true },
      });
      securityAuditService.logSecurityEvent({
        eventType: 'data_access',
        severity: 'medium',
        ip,
        userAgent: 'test',
        details: { scoreTest: true },
      });
      securityAuditService.logSecurityEvent({
        eventType: 'suspicious_activity',
        severity: 'high',
        ip,
        userAgent: 'test',
        details: { scoreTest: true },
      });
      securityAuditService.logSecurityEvent({
        eventType: 'system_change',
        severity: 'critical',
        ip,
        userAgent: 'test',
        details: { scoreTest: true },
      });

      const metrics = securityAuditService.getSecurityMetrics(1);

      // The base score from these 4 events alone would be 1+3+7+15 = 26,
      // plus additional factors from all accumulated events in the singleton.
      // The key assertion: score is a positive number reflecting severity weights.
      expect(metrics.riskScore).toBeGreaterThanOrEqual(26);
      expect(metrics.riskScore).toBeLessThanOrEqual(100); // Capped at 100
    });
  });

  describe('detectAnomalies', () => {
    it('flags IPs with >10 login failures', () => {
      const ip = uniqueIP();

      // Log 12 auth_failure events from the same IP
      for (let i = 0; i < 12; i++) {
        securityAuditService.logSecurityEvent({
          eventType: 'auth_failure',
          severity: 'medium',
          ip,
          userAgent: 'anomaly-test-agent',
          details: { anomalyTest: true, attempt: i + 1 },
        });
      }

      const anomalies = securityAuditService.detectAnomalies();

      const rapidFailure = anomalies.find(
        a => a.details.anomalyType === 'rapid_login_failures' && a.ip === ip,
      );
      expect(rapidFailure).toBeDefined();
      expect(rapidFailure!.severity).toBe('high');
      expect(rapidFailure!.details.count).toBeGreaterThan(10);
    });
  });

  describe('getSecurityReport', () => {
    it('includes recommendations when risk is high', () => {
      // The singleton already has many events from prior tests which raise
      // the risk score. We can additionally pump suspicious IPs above 5 to
      // trigger that recommendation.
      const ips: string[] = [];
      for (let i = 0; i < 7; i++) {
        const ip = uniqueIP();
        ips.push(ip);
        for (let j = 0; j < 6; j++) {
          securityAuditService.logSecurityEvent(makeEvent({ ip }));
        }
      }

      const report = securityAuditService.getSecurityReport();

      expect(report.summary).toBeDefined();
      expect(report.recentEvents).toBeDefined();
      expect(Array.isArray(report.recentEvents)).toBe(true);
      expect(report.suspiciousIPs).toBeDefined();
      expect(Array.isArray(report.suspiciousIPs)).toBe(true);
      expect(report.anomalies).toBeDefined();
      expect(Array.isArray(report.anomalies)).toBe(true);
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);

      // With 7+ suspicious IPs and many events, at least one recommendation
      // should be present.
      expect(report.recommendations.length).toBeGreaterThanOrEqual(1);

      // Verify that the suspicious IPs recommendation is triggered
      const hasSuspiciousIPRec = report.recommendations.some(r =>
        r.includes('suspicious IP'),
      );
      expect(hasSuspiciousIPRec).toBe(true);
    });
  });
});
