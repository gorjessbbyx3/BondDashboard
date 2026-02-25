import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorage } from './storage';

/**
 * Comprehensive tests for the MemoryStorage class.
 *
 * Each describe block creates a fresh MemoryStorage instance via beforeEach
 * so that tests are fully isolated from one another.
 */

let storage: MemoryStorage;

// Helper: create a client with sensible defaults so tests stay concise.
function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    clientId: `CLI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fullName: 'Test Client',
    companyId: 1,
    password: 'hashed_pw',
    ...overrides,
  } as any;
}

// ---------------------------------------------------------------------------
// User operations
// ---------------------------------------------------------------------------
describe('User operations', () => {
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('getUser returns undefined when no user exists', async () => {
    const result = await storage.getUser('nonexistent');
    expect(result).toBeUndefined();
  });

  it('upsertUser creates a new user and assigns timestamps', async () => {
    const user = await storage.upsertUser({ id: 'u1', email: 'a@b.com', firstName: 'John', lastName: 'Doe' } as any);
    expect(user.id).toBe('u1');
    expect(user.email).toBe('a@b.com');
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('upsertUser updates an existing user', async () => {
    await storage.upsertUser({ id: 'u2', email: 'old@b.com' } as any);
    const updated = await storage.upsertUser({ id: 'u2', email: 'new@b.com' } as any);
    expect(updated.email).toBe('new@b.com');

    // Verify the user list was updated in-place, not duplicated.
    const fetched = await storage.getUser('u2');
    expect(fetched?.email).toBe('new@b.com');
  });

  it('getUser retrieves a previously created user', async () => {
    await storage.upsertUser({ id: 'u3', email: 'x@y.com' } as any);
    const found = await storage.getUser('u3');
    expect(found).toBeDefined();
    expect(found!.id).toBe('u3');
  });
});

// ---------------------------------------------------------------------------
// Client operations
// ---------------------------------------------------------------------------
describe('Client operations', () => {
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('createClient assigns auto-incremented id and timestamps', async () => {
    const c = await storage.createClient(makeClient({ fullName: 'Alice' }));
    expect(typeof c.id).toBe('number');
    expect(c.id).toBeGreaterThan(0);
    expect(c.fullName).toBe('Alice');
    expect(c.createdAt).toBeInstanceOf(Date);
    expect(c.updatedAt).toBeInstanceOf(Date);
  });

  it('getClient retrieves by numeric id', async () => {
    const created = await storage.createClient(makeClient());
    const found = await storage.getClient(created.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(created.id);
  });

  it('getClient returns undefined for unknown id', async () => {
    const result = await storage.getClient(99999);
    expect(result).toBeUndefined();
  });

  it('getClientByClientId retrieves by string clientId', async () => {
    const created = await storage.createClient(makeClient({ clientId: 'UNIQUE-001' }));
    const found = await storage.getClientByClientId('UNIQUE-001');
    expect(found).toBeDefined();
    expect(found!.id).toBe(created.id);
  });

  it('getClientByClientId returns undefined for unknown clientId', async () => {
    const result = await storage.getClientByClientId('NOPE');
    expect(result).toBeUndefined();
  });

  it('getAllClients returns clients sorted by createdAt desc', async () => {
    const c1 = await storage.createClient(makeClient({ fullName: 'First' }));
    // Introduce a tiny delay so timestamps differ.
    await new Promise(r => setTimeout(r, 5));
    const c2 = await storage.createClient(makeClient({ fullName: 'Second' }));

    const all = await storage.getAllClients();
    expect(all.length).toBe(2);
    // Most recently created first
    expect(all[0].id).toBe(c2.id);
    expect(all[1].id).toBe(c1.id);
  });

  it('updateClient merges updates and refreshes updatedAt', async () => {
    const created = await storage.createClient(makeClient({ fullName: 'Before' }));
    const updated = await storage.updateClient(created.id, { fullName: 'After' });
    expect(updated.fullName).toBe('After');
    expect(updated.updatedAt).toBeInstanceOf(Date);
  });

  it('updateClient throws when client not found', async () => {
    await expect(storage.updateClient(99999, { fullName: 'X' })).rejects.toThrow('Client not found');
  });

  it('deleteClient removes the client', async () => {
    const created = await storage.createClient(makeClient());
    await storage.deleteClient(created.id);
    const result = await storage.getClient(created.id);
    expect(result).toBeUndefined();
  });

  it('deleteClient is silent when id does not exist', async () => {
    // Should not throw
    await expect(storage.deleteClient(99999)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Check-in operations
// ---------------------------------------------------------------------------
describe('Check-in operations', () => {
  let clientId: number;

  beforeEach(async () => {
    storage = new MemoryStorage();
    const client = await storage.createClient(makeClient({ missedCheckIns: 5 }));
    clientId = client.id;
  });

  it('createCheckIn assigns id and timestamps', async () => {
    const ci = await storage.createCheckIn({ clientId, location: 'Office' } as any);
    expect(ci.id).toBeGreaterThan(0);
    expect(ci.clientId).toBe(clientId);
    expect(ci.createdAt).toBeInstanceOf(Date);
  });

  it('createCheckIn updates the parent client lastCheckIn and resets missedCheckIns', async () => {
    await storage.createCheckIn({ clientId } as any);
    const client = await storage.getClient(clientId);
    expect(client!.lastCheckIn).toBeInstanceOf(Date);
    expect(client!.missedCheckIns).toBe(0);
  });

  it('getClientCheckIns returns check-ins sorted by checkInTime desc', async () => {
    const ci1 = await storage.createCheckIn({ clientId, checkInTime: new Date('2025-01-01') } as any);
    const ci2 = await storage.createCheckIn({ clientId, checkInTime: new Date('2025-06-01') } as any);

    const results = await storage.getClientCheckIns(clientId);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe(ci2.id);
    expect(results[1].id).toBe(ci1.id);
  });

  it('getClientCheckIns returns empty array for client with no check-ins', async () => {
    const results = await storage.getClientCheckIns(99999);
    expect(results).toEqual([]);
  });

  it('getLastCheckIn returns the most recent check-in', async () => {
    await storage.createCheckIn({ clientId, checkInTime: new Date('2025-01-01') } as any);
    const latest = await storage.createCheckIn({ clientId, checkInTime: new Date('2025-12-01') } as any);

    const result = await storage.getLastCheckIn(clientId);
    expect(result).toBeDefined();
    expect(result!.id).toBe(latest.id);
  });

  it('getLastCheckIn returns undefined for client with no check-ins', async () => {
    const result = await storage.getLastCheckIn(99999);
    expect(result).toBeUndefined();
  });

  it('deleteCheckIn removes the check-in', async () => {
    const ci = await storage.createCheckIn({ clientId } as any);
    await storage.deleteCheckIn(ci.id);
    const all = await storage.getAllCheckIns();
    expect(all.find(c => c.id === ci.id)).toBeUndefined();
  });

  it('getAllCheckIns returns all check-ins sorted by checkInTime desc', async () => {
    const other = await storage.createClient(makeClient());
    await storage.createCheckIn({ clientId, checkInTime: new Date('2025-01-01') } as any);
    await storage.createCheckIn({ clientId: other.id, checkInTime: new Date('2025-06-01') } as any);

    const all = await storage.getAllCheckIns();
    expect(all.length).toBe(2);
    // Most recent first
    expect(new Date(all[0].checkInTime!).getTime()).toBeGreaterThanOrEqual(new Date(all[1].checkInTime!).getTime());
  });
});

// ---------------------------------------------------------------------------
// Payment operations
// ---------------------------------------------------------------------------
describe('Payment operations', () => {
  let clientId: number;

  beforeEach(async () => {
    storage = new MemoryStorage();
    const client = await storage.createClient(makeClient());
    clientId = client.id;
  });

  it('createPayment sets confirmed=false and assigns id', async () => {
    const p = await storage.createPayment({ clientId, amount: '100.00' } as any);
    expect(p.id).toBeGreaterThan(0);
    expect(p.confirmed).toBe(false);
    expect(p.createdAt).toBeInstanceOf(Date);
  });

  it('getClientPayments returns payments sorted by paymentDate desc', async () => {
    const p1 = await storage.createPayment({ clientId, amount: '50.00', paymentDate: new Date('2025-01-01') } as any);
    const p2 = await storage.createPayment({ clientId, amount: '75.00', paymentDate: new Date('2025-06-01') } as any);

    const results = await storage.getClientPayments(clientId);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe(p2.id);
    expect(results[1].id).toBe(p1.id);
  });

  it('getClientPayments returns empty array for unknown clientId', async () => {
    const results = await storage.getClientPayments(99999);
    expect(results).toEqual([]);
  });

  it('getAllPayments returns all payments sorted by paymentDate desc', async () => {
    await storage.createPayment({ clientId, amount: '10.00', paymentDate: new Date('2025-03-01') } as any);
    await storage.createPayment({ clientId, amount: '20.00', paymentDate: new Date('2025-09-01') } as any);

    const all = await storage.getAllPayments();
    expect(all.length).toBe(2);
    expect(new Date(all[0].paymentDate!).getTime()).toBeGreaterThanOrEqual(new Date(all[1].paymentDate!).getTime());
  });

  it('confirmPayment sets confirmed, confirmedBy, and confirmedAt', async () => {
    const p = await storage.createPayment({ clientId, amount: '200.00' } as any);
    const confirmed = await storage.confirmPayment(p.id, 'admin-user');
    expect(confirmed.confirmed).toBe(true);
    expect(confirmed.confirmedBy).toBe('admin-user');
    expect(confirmed.confirmedAt).toBeInstanceOf(Date);
  });

  it('confirmPayment throws when payment not found', async () => {
    await expect(storage.confirmPayment(99999, 'admin')).rejects.toThrow('Payment not found');
  });

  it('deletePayment removes the payment', async () => {
    const p = await storage.createPayment({ clientId, amount: '50.00' } as any);
    await storage.deletePayment(p.id);
    const all = await storage.getAllPayments();
    expect(all.find(x => x.id === p.id)).toBeUndefined();
  });

  it('deletePayment is silent when id does not exist', async () => {
    await expect(storage.deletePayment(99999)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Message operations
// ---------------------------------------------------------------------------
describe('Message operations', () => {
  let clientId: number;

  beforeEach(async () => {
    storage = new MemoryStorage();
    const client = await storage.createClient(makeClient());
    clientId = client.id;
  });

  it('createMessage sets isRead=false and assigns id', async () => {
    const msg = await storage.createMessage({ clientId, message: 'Hello', senderType: 'admin' } as any);
    expect(msg.id).toBeGreaterThan(0);
    expect(msg.isRead).toBe(false);
    expect(msg.createdAt).toBeInstanceOf(Date);
  });

  it('getClientMessages returns messages sorted by createdAt desc', async () => {
    const m1 = await storage.createMessage({ clientId, message: 'First', senderType: 'admin' } as any);
    // Small delay so createdAt differs
    await new Promise(r => setTimeout(r, 5));
    const m2 = await storage.createMessage({ clientId, message: 'Second', senderType: 'client' } as any);

    const msgs = await storage.getClientMessages(clientId);
    expect(msgs.length).toBe(2);
    expect(msgs[0].id).toBe(m2.id);
    expect(msgs[1].id).toBe(m1.id);
  });

  it('getClientMessages returns empty array when client has no messages', async () => {
    const msgs = await storage.getClientMessages(99999);
    expect(msgs).toEqual([]);
  });

  it('markMessageAsRead sets isRead to true', async () => {
    const msg = await storage.createMessage({ clientId, message: 'Read me', senderType: 'admin' } as any);
    expect(msg.isRead).toBe(false);

    await storage.markMessageAsRead(msg.id);

    const msgs = await storage.getClientMessages(clientId);
    const found = msgs.find(m => m.id === msg.id);
    expect(found!.isRead).toBe(true);
  });

  it('markMessageAsRead is silent when message not found', async () => {
    // Should not throw
    await expect(storage.markMessageAsRead(99999)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Court date operations
// ---------------------------------------------------------------------------
describe('Court date operations', () => {
  let clientId: number;

  beforeEach(async () => {
    storage = new MemoryStorage();
    const client = await storage.createClient(makeClient());
    clientId = client.id;
  });

  it('createCourtDate sets completed=false and assigns id', async () => {
    const cd = await storage.createCourtDate({
      clientId,
      courtDate: new Date('2027-06-15'),
      courtType: 'hearing',
    } as any);
    expect(cd.id).toBeGreaterThan(0);
    expect(cd.completed).toBe(false);
    expect(cd.createdAt).toBeInstanceOf(Date);
  });

  it('getClientCourtDates returns court dates sorted by courtDate desc', async () => {
    const cd1 = await storage.createCourtDate({ clientId, courtDate: new Date('2027-01-01'), courtType: 'hearing' } as any);
    const cd2 = await storage.createCourtDate({ clientId, courtDate: new Date('2027-06-01'), courtType: 'trial' } as any);

    const results = await storage.getClientCourtDates(clientId);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe(cd2.id);
    expect(results[1].id).toBe(cd1.id);
  });

  it('getAllUpcomingCourtDates returns future, non-completed court dates sorted asc', async () => {
    // Past date -- should not appear
    await storage.createCourtDate({ clientId, courtDate: new Date('2020-01-01'), courtType: 'hearing' } as any);
    // Future date
    const future1 = await storage.createCourtDate({ clientId, courtDate: new Date('2029-01-01'), courtType: 'hearing' } as any);
    const future2 = await storage.createCourtDate({ clientId, courtDate: new Date('2028-01-01'), courtType: 'trial' } as any);
    // Future but completed
    const completed = await storage.createCourtDate({ clientId, courtDate: new Date('2029-06-01'), courtType: 'hearing' } as any);
    await storage.updateCourtDate(completed.id, { completed: true });

    const upcoming = await storage.getAllUpcomingCourtDates();
    expect(upcoming.length).toBe(2);
    // Sorted ascending by court date
    expect(upcoming[0].id).toBe(future2.id);
    expect(upcoming[1].id).toBe(future1.id);
  });

  it('updateCourtDate merges updates', async () => {
    const cd = await storage.createCourtDate({ clientId, courtDate: new Date('2027-01-01'), courtType: 'hearing' } as any);
    const updated = await storage.updateCourtDate(cd.id, { courtType: 'trial' });
    expect(updated.courtType).toBe('trial');
  });

  it('updateCourtDate throws when court date not found', async () => {
    await expect(storage.updateCourtDate(99999, {})).rejects.toThrow('Court date not found');
  });

  it('deleteCourtDate removes the court date', async () => {
    const cd = await storage.createCourtDate({ clientId, courtDate: new Date('2027-01-01'), courtType: 'hearing' } as any);
    await storage.deleteCourtDate(cd.id);
    const all = await storage.getAllCourtDates();
    expect(all.find(x => x.id === cd.id)).toBeUndefined();
  });

  it('approveCourtDate sets adminApproved, approvedBy, approvedAt', async () => {
    const cd = await storage.createCourtDate({ clientId, courtDate: new Date('2027-01-01'), courtType: 'hearing' } as any);
    const approved = await storage.approveCourtDate(cd.id, 'admin-user');
    expect(approved.adminApproved).toBe(true);
    expect(approved.approvedBy).toBe('admin-user');
    expect(approved.approvedAt).toBeInstanceOf(Date);
  });

  it('approveCourtDate throws when court date not found', async () => {
    await expect(storage.approveCourtDate(99999, 'admin')).rejects.toThrow('Court date not found');
  });

  it('getPendingCourtDates returns only unapproved court dates', async () => {
    const cd1 = await storage.createCourtDate({ clientId, courtDate: new Date('2027-01-01'), courtType: 'hearing' } as any);
    const cd2 = await storage.createCourtDate({ clientId, courtDate: new Date('2027-02-01'), courtType: 'trial' } as any);
    await storage.approveCourtDate(cd1.id, 'admin');

    const pending = await storage.getPendingCourtDates();
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe(cd2.id);
  });

  it('acknowledgeCourtDate sets clientAcknowledged and acknowledgedAt', async () => {
    const cd = await storage.createCourtDate({ clientId, courtDate: new Date('2027-01-01'), courtType: 'hearing' } as any);
    const ack = await storage.acknowledgeCourtDate(cd.id, clientId);
    expect(ack.clientAcknowledged).toBe(true);
    expect(ack.acknowledgedAt).toBeInstanceOf(Date);
  });

  it('acknowledgeCourtDate throws when court date not found', async () => {
    await expect(storage.acknowledgeCourtDate(99999, clientId)).rejects.toThrow('Court date not found');
  });

  it('getClientApprovedCourtDates filters by clientId and adminApproved', async () => {
    const cd1 = await storage.createCourtDate({ clientId, courtDate: new Date('2027-01-01'), courtType: 'hearing' } as any);
    await storage.createCourtDate({ clientId, courtDate: new Date('2027-02-01'), courtType: 'trial' } as any);
    await storage.approveCourtDate(cd1.id, 'admin');

    const approved = await storage.getClientApprovedCourtDates(clientId);
    expect(approved.length).toBe(1);
    expect(approved[0].id).toBe(cd1.id);
  });
});

// ---------------------------------------------------------------------------
// Expense operations
// ---------------------------------------------------------------------------
describe('Expense operations', () => {
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('createExpense assigns id and timestamps', async () => {
    const e = await storage.createExpense({ description: 'Gas', amount: '45.00', category: 'travel' } as any);
    expect(e.id).toBeGreaterThan(0);
    expect(e.description).toBe('Gas');
    expect(e.createdAt).toBeInstanceOf(Date);
  });

  it('getAllExpenses returns expenses sorted by expenseDate desc', async () => {
    await storage.createExpense({ description: 'A', amount: '10.00', expenseDate: new Date('2025-01-01') } as any);
    await storage.createExpense({ description: 'B', amount: '20.00', expenseDate: new Date('2025-06-01') } as any);

    const all = await storage.getAllExpenses();
    expect(all.length).toBe(2);
    expect(new Date(all[0].expenseDate!).getTime()).toBeGreaterThanOrEqual(new Date(all[1].expenseDate!).getTime());
  });

  it('getExpensesByDateRange filters by date range', async () => {
    await storage.createExpense({ description: 'Too early', amount: '10.00', expenseDate: new Date('2025-01-01') } as any);
    await storage.createExpense({ description: 'In range', amount: '20.00', expenseDate: new Date('2025-06-15') } as any);
    await storage.createExpense({ description: 'Too late', amount: '30.00', expenseDate: new Date('2025-12-01') } as any);

    const results = await storage.getExpensesByDateRange(new Date('2025-06-01'), new Date('2025-07-01'));
    expect(results.length).toBe(1);
    expect(results[0].description).toBe('In range');
  });

  it('getExpensesByDateRange returns empty array when no expenses in range', async () => {
    await storage.createExpense({ description: 'Out', amount: '10.00', expenseDate: new Date('2025-01-01') } as any);
    const results = await storage.getExpensesByDateRange(new Date('2026-01-01'), new Date('2026-12-31'));
    expect(results).toEqual([]);
  });

  it('updateExpense merges updates', async () => {
    const e = await storage.createExpense({ description: 'Old', amount: '10.00' } as any);
    const updated = await storage.updateExpense(e.id, { description: 'New' });
    expect(updated.description).toBe('New');
  });

  it('updateExpense throws when expense not found', async () => {
    await expect(storage.updateExpense(99999, { description: 'X' })).rejects.toThrow('Expense not found');
  });

  it('deleteExpense removes the expense', async () => {
    const e = await storage.createExpense({ description: 'Trash', amount: '10.00' } as any);
    await storage.deleteExpense(e.id);
    const all = await storage.getAllExpenses();
    expect(all.find(x => x.id === e.id)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Alert operations
// ---------------------------------------------------------------------------
describe('Alert operations', () => {
  let clientId: number;

  beforeEach(async () => {
    storage = new MemoryStorage();
    const client = await storage.createClient(makeClient());
    clientId = client.id;
  });

  it('createAlert sets acknowledged=false and assigns id', async () => {
    const a = await storage.createAlert({
      clientId,
      alertType: 'missed_checkin',
      severity: 'high',
      message: 'Missed check-in!',
    } as any);
    expect(a.id).toBeGreaterThan(0);
    expect(a.acknowledged).toBe(false);
    expect(a.createdAt).toBeInstanceOf(Date);
  });

  it('getClientAlerts returns alerts sorted by createdAt desc', async () => {
    const a1 = await storage.createAlert({ clientId, alertType: 'payment_due', severity: 'low', message: 'First' } as any);
    await new Promise(r => setTimeout(r, 5));
    const a2 = await storage.createAlert({ clientId, alertType: 'court_reminder', severity: 'medium', message: 'Second' } as any);

    const alerts = await storage.getClientAlerts(clientId);
    expect(alerts.length).toBe(2);
    expect(alerts[0].id).toBe(a2.id);
    expect(alerts[1].id).toBe(a1.id);
  });

  it('getClientAlerts returns empty array for unknown clientId', async () => {
    const alerts = await storage.getClientAlerts(99999);
    expect(alerts).toEqual([]);
  });

  it('getAllUnacknowledgedAlerts returns only unacknowledged alerts', async () => {
    const a1 = await storage.createAlert({ clientId, alertType: 'missed_checkin', severity: 'high', message: 'One' } as any);
    const a2 = await storage.createAlert({ clientId, alertType: 'payment_due', severity: 'low', message: 'Two' } as any);
    await storage.acknowledgeAlert(a1.id, 'admin');

    const unack = await storage.getAllUnacknowledgedAlerts();
    expect(unack.length).toBe(1);
    expect(unack[0].id).toBe(a2.id);
  });

  it('acknowledgeAlert sets acknowledged, acknowledgedBy, acknowledgedAt', async () => {
    const a = await storage.createAlert({ clientId, alertType: 'missed_checkin', severity: 'high', message: 'Ack me' } as any);
    const acked = await storage.acknowledgeAlert(a.id, 'admin-user');
    expect(acked.acknowledged).toBe(true);
    expect(acked.acknowledgedBy).toBe('admin-user');
    expect(acked.acknowledgedAt).toBeInstanceOf(Date);
  });

  it('acknowledgeAlert throws when alert not found', async () => {
    await expect(storage.acknowledgeAlert(99999, 'admin')).rejects.toThrow('Alert not found');
  });
});

// ---------------------------------------------------------------------------
// Bond operations
// ---------------------------------------------------------------------------
describe('Bond operations', () => {
  let clientId: number;

  beforeEach(async () => {
    storage = new MemoryStorage();
    const client = await storage.createClient(makeClient());
    clientId = client.id;
  });

  it('createBond assigns id and timestamps', async () => {
    const b = await storage.createBond({
      clientId,
      companyId: 1,
      bondAmount: '5000.00',
      totalOwed: '500.00',
      remainingBalance: '500.00',
      status: 'active',
    } as any);
    expect(b.id).toBeGreaterThan(0);
    expect(b.createdAt).toBeInstanceOf(Date);
    expect(b.updatedAt).toBeInstanceOf(Date);
  });

  it('getClientBonds returns bonds belonging to the client', async () => {
    await storage.createBond({ clientId, companyId: 1, bondAmount: '1000.00', totalOwed: '100.00', remainingBalance: '100.00', status: 'active' } as any);
    await storage.createBond({ clientId, companyId: 1, bondAmount: '2000.00', totalOwed: '200.00', remainingBalance: '200.00', status: 'completed' } as any);

    const bonds = await storage.getClientBonds(clientId);
    expect(bonds.length).toBe(2);
    bonds.forEach(b => expect(b.clientId).toBe(clientId));
  });

  it('getClientBonds returns empty array for unknown clientId', async () => {
    const bonds = await storage.getClientBonds(99999);
    expect(bonds).toEqual([]);
  });

  it('getAllBonds returns all bonds', async () => {
    const otherClient = await storage.createClient(makeClient());
    await storage.createBond({ clientId, companyId: 1, bondAmount: '1000.00', totalOwed: '100.00', remainingBalance: '100.00', status: 'active' } as any);
    await storage.createBond({ clientId: otherClient.id, companyId: 1, bondAmount: '2000.00', totalOwed: '200.00', remainingBalance: '200.00', status: 'active' } as any);

    const all = await storage.getAllBonds();
    expect(all.length).toBe(2);
  });

  it('updateBond merges updates and refreshes updatedAt', async () => {
    const b = await storage.createBond({ clientId, companyId: 1, bondAmount: '5000.00', totalOwed: '500.00', remainingBalance: '500.00', status: 'active' } as any);
    const updated = await storage.updateBond(b.id, { status: 'completed' });
    expect(updated.status).toBe('completed');
    expect(updated.updatedAt).toBeInstanceOf(Date);
  });

  it('updateBond throws when bond not found', async () => {
    await expect(storage.updateBond(99999, { status: 'active' })).rejects.toThrow('Bond not found');
  });

  it('deleteBond removes the bond', async () => {
    const b = await storage.createBond({ clientId, companyId: 1, bondAmount: '5000.00', totalOwed: '500.00', remainingBalance: '500.00', status: 'active' } as any);
    await storage.deleteBond(b.id);
    const all = await storage.getAllBonds();
    expect(all.find(x => x.id === b.id)).toBeUndefined();
  });

  it('getActiveBonds returns only bonds with status active', async () => {
    await storage.createBond({ clientId, companyId: 1, bondAmount: '1000.00', totalOwed: '100.00', remainingBalance: '100.00', status: 'active' } as any);
    await storage.createBond({ clientId, companyId: 1, bondAmount: '2000.00', totalOwed: '200.00', remainingBalance: '200.00', status: 'completed' } as any);

    const active = await storage.getActiveBonds();
    expect(active.length).toBe(1);
    expect(active[0].status).toBe('active');
  });

  it('getClientActiveBondCount returns the count of active bonds for a client', async () => {
    await storage.createBond({ clientId, companyId: 1, bondAmount: '1000.00', totalOwed: '100.00', remainingBalance: '100.00', status: 'active' } as any);
    await storage.createBond({ clientId, companyId: 1, bondAmount: '2000.00', totalOwed: '200.00', remainingBalance: '200.00', status: 'active' } as any);
    await storage.createBond({ clientId, companyId: 1, bondAmount: '3000.00', totalOwed: '300.00', remainingBalance: '300.00', status: 'forfeited' } as any);

    const count = await storage.getClientActiveBondCount(clientId);
    expect(count).toBe(2);
  });

  it('getClientActiveBondCount returns 0 for unknown clientId', async () => {
    const count = await storage.getClientActiveBondCount(99999);
    expect(count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Notification operations
// ---------------------------------------------------------------------------
describe('Notification operations', () => {
  const userId = 'notif-user-1';

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('createNotification assigns id and defaults', async () => {
    const n = await storage.createNotification({
      userId,
      title: 'Court Reminder',
      message: 'You have court tomorrow.',
      type: 'court_reminder',
    } as any);
    expect(n.id).toBeGreaterThan(0);
    expect(n.read).toBe(false);
    expect(n.confirmed).toBe(false);
    expect(n.priority).toBe('medium');
    expect(n.createdAt).toBeInstanceOf(Date);
  });

  it('getUserNotifications returns notifications sorted by createdAt desc', async () => {
    const n1 = await storage.createNotification({ userId, title: 'A', message: 'm', type: 'system_alert' } as any);
    await new Promise(r => setTimeout(r, 5));
    const n2 = await storage.createNotification({ userId, title: 'B', message: 'm', type: 'system_alert' } as any);

    const results = await storage.getUserNotifications(userId);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe(n2.id);
    expect(results[1].id).toBe(n1.id);
  });

  it('getUserNotifications returns empty array for unknown userId', async () => {
    const results = await storage.getUserNotifications('unknown');
    expect(results).toEqual([]);
  });

  it('getUnreadNotifications returns only unread notifications', async () => {
    const n1 = await storage.createNotification({ userId, title: 'A', message: 'm', type: 'system_alert' } as any);
    const n2 = await storage.createNotification({ userId, title: 'B', message: 'm', type: 'system_alert' } as any);
    await storage.markNotificationAsRead(n1.id);

    const unread = await storage.getUnreadNotifications(userId);
    expect(unread.length).toBe(1);
    expect(unread[0].id).toBe(n2.id);
  });

  it('markNotificationAsRead sets read to true', async () => {
    const n = await storage.createNotification({ userId, title: 'Read me', message: 'm', type: 'system_alert' } as any);
    const result = await storage.markNotificationAsRead(n.id);
    expect(result.read).toBe(true);
  });

  it('markNotificationAsRead throws when notification not found', async () => {
    await expect(storage.markNotificationAsRead(99999)).rejects.toThrow('not found');
  });

  it('markAllNotificationsAsRead marks all user notifications as read', async () => {
    await storage.createNotification({ userId, title: 'A', message: 'm', type: 'system_alert' } as any);
    await storage.createNotification({ userId, title: 'B', message: 'm', type: 'system_alert' } as any);
    // Another user's notification should be unaffected
    await storage.createNotification({ userId: 'other-user', title: 'C', message: 'm', type: 'system_alert' } as any);

    await storage.markAllNotificationsAsRead(userId);

    const unread = await storage.getUnreadNotifications(userId);
    expect(unread.length).toBe(0);

    const otherUnread = await storage.getUnreadNotifications('other-user');
    expect(otherUnread.length).toBe(1);
  });

  it('confirmNotification sets confirmed, confirmedBy, confirmedAt', async () => {
    const n = await storage.createNotification({ userId, title: 'Confirm me', message: 'm', type: 'system_alert' } as any);
    const confirmed = await storage.confirmNotification(n.id, 'admin-user');
    expect(confirmed.confirmed).toBe(true);
    expect(confirmed.confirmedBy).toBe('admin-user');
    expect(confirmed.confirmedAt).toBeInstanceOf(Date);
  });

  it('confirmNotification throws when notification not found', async () => {
    await expect(storage.confirmNotification(99999, 'admin')).rejects.toThrow('Notification not found');
  });

  it('deleteNotification removes the notification', async () => {
    const n = await storage.createNotification({ userId, title: 'Delete me', message: 'm', type: 'system_alert' } as any);
    await storage.deleteNotification(n.id);
    const all = await storage.getUserNotifications(userId);
    expect(all.find(x => x.id === n.id)).toBeUndefined();
  });

  it('deleteNotification is silent when id does not exist', async () => {
    await expect(storage.deleteNotification(99999)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Court date reminder operations
// ---------------------------------------------------------------------------
describe('Court date reminder operations', () => {
  let clientId: number;

  beforeEach(async () => {
    storage = new MemoryStorage();
    const client = await storage.createClient(makeClient());
    clientId = client.id;
  });

  it('createCourtDateReminder assigns id and defaults', async () => {
    const cd = await storage.createCourtDate({ clientId, courtDate: new Date('2027-06-15'), courtType: 'hearing' } as any);
    const reminder = await storage.createCourtDateReminder({
      courtDateId: cd.id,
      reminderType: 'initial',
      scheduledFor: new Date('2027-06-12'),
      sent: false,
      confirmed: false,
      confirmedBy: null,
      confirmedAt: null,
      notificationId: null,
    } as any);
    expect(reminder.id).toBeGreaterThan(0);
    expect(reminder.sent).toBe(false);
    expect(reminder.confirmed).toBe(false);
    expect(reminder.createdAt).toBeInstanceOf(Date);
  });

  it('getCourtDateRemindersForDate returns reminders for a specific court date', async () => {
    const cd1 = await storage.createCourtDate({ clientId, courtDate: new Date('2027-06-15'), courtType: 'hearing' } as any);
    const cd2 = await storage.createCourtDate({ clientId, courtDate: new Date('2027-07-15'), courtType: 'trial' } as any);

    await storage.createCourtDateReminder({ courtDateId: cd1.id, reminderType: 'initial', scheduledFor: new Date('2027-06-12'), sent: false, confirmed: false, confirmedBy: null, notificationId: null } as any);
    await storage.createCourtDateReminder({ courtDateId: cd1.id, reminderType: 'followup_1', scheduledFor: new Date('2027-06-14'), sent: false, confirmed: false, confirmedBy: null, notificationId: null } as any);
    await storage.createCourtDateReminder({ courtDateId: cd2.id, reminderType: 'initial', scheduledFor: new Date('2027-07-12'), sent: false, confirmed: false, confirmedBy: null, notificationId: null } as any);

    const reminders = await storage.getCourtDateRemindersForDate(cd1.id);
    expect(reminders.length).toBe(2);
    reminders.forEach(r => expect(r.courtDateId).toBe(cd1.id));
  });

  it('getCourtDateRemindersForDate returns empty array when no reminders', async () => {
    const reminders = await storage.getCourtDateRemindersForDate(99999);
    expect(reminders).toEqual([]);
  });

  it('getAllCourtDates returns all court dates', async () => {
    await storage.createCourtDate({ clientId, courtDate: new Date('2027-01-01'), courtType: 'hearing' } as any);
    await storage.createCourtDate({ clientId, courtDate: new Date('2020-01-01'), courtType: 'trial' } as any);

    const all = await storage.getAllCourtDates();
    expect(all.length).toBe(2);
  });

  it('getCourtDateReminders generates reminders for court dates within 7 days', async () => {
    const now = new Date();

    // Court date 3 days from now
    const threeDays = new Date(now);
    threeDays.setDate(threeDays.getDate() + 3);
    await storage.createCourtDate({ clientId, courtDate: threeDays, courtType: 'hearing' } as any);

    // Court date 10 days from now -- should NOT generate a reminder
    const tenDays = new Date(now);
    tenDays.setDate(tenDays.getDate() + 10);
    await storage.createCourtDate({ clientId, courtDate: tenDays, courtType: 'trial' } as any);

    const reminders = await storage.getCourtDateReminders();
    expect(reminders.length).toBe(1);
    expect(reminders[0].daysUntil).toBeLessThanOrEqual(7);
    expect(reminders[0].daysUntil).toBeGreaterThanOrEqual(0);
  });

  it('getCourtDateReminders assigns priority based on days until court date', async () => {
    const now = new Date();

    // Today
    const today = new Date(now);
    today.setHours(23, 59, 59, 999);
    await storage.createCourtDate({ clientId, courtDate: today, courtType: 'hearing' } as any);

    // Tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    await storage.createCourtDate({ clientId, courtDate: tomorrow, courtType: 'trial' } as any);

    const reminders = await storage.getCourtDateReminders();
    const todayReminder = reminders.find(r => r.daysUntil === 0);
    const tomorrowReminder = reminders.find(r => r.daysUntil === 1);

    if (todayReminder) {
      expect(todayReminder.priority).toBe('critical');
      expect(todayReminder.type).toBe('today');
    }
    if (tomorrowReminder) {
      expect(tomorrowReminder.priority).toBe('high');
    }
  });

  it('scheduleFollowupReminders creates reminders for a future court date', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10); // 10 days from now

    const cd = await storage.createCourtDate({ clientId, courtDate: futureDate, courtType: 'hearing' } as any);
    await storage.scheduleFollowupReminders(cd.id);

    const reminders = await storage.getCourtDateRemindersForDate(cd.id);
    // Should create initial (3 days before), followup_1 (1 day before), followup_2 (3 hours before)
    expect(reminders.length).toBeGreaterThanOrEqual(2);
    const types = reminders.map(r => r.reminderType);
    expect(types).toContain('initial');
    expect(types).toContain('followup_1');
  });
});

// ---------------------------------------------------------------------------
// Notification preferences operations
// ---------------------------------------------------------------------------
describe('Notification preferences operations', () => {
  const userId = 'pref-user-1';

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('getUserNotificationPreferences returns undefined for unknown user', async () => {
    const result = await storage.getUserNotificationPreferences('unknown');
    expect(result).toBeUndefined();
  });

  it('upsertNotificationPreferences creates new preferences with defaults', async () => {
    const prefs = await storage.upsertNotificationPreferences({ userId } as any);
    expect(prefs.id).toBeGreaterThan(0);
    expect(prefs.userId).toBe(userId);
    expect(prefs.emailEnabled).toBe(true);
    expect(prefs.courtReminderDays).toBe(3);
    expect(prefs.quietHoursStart).toBe('22:00');
    expect(prefs.quietHoursEnd).toBe('08:00');
    expect(prefs.createdAt).toBeInstanceOf(Date);
  });

  it('upsertNotificationPreferences updates existing preferences', async () => {
    await storage.upsertNotificationPreferences({ userId } as any);
    const updated = await storage.upsertNotificationPreferences({ userId, emailEnabled: false, courtReminderDays: 5 } as any);
    expect(updated.emailEnabled).toBe(false);
    expect(updated.courtReminderDays).toBe(5);
    expect(updated.updatedAt).toBeInstanceOf(Date);
  });

  it('getUserNotificationPreferences retrieves previously saved preferences', async () => {
    await storage.upsertNotificationPreferences({ userId, soundEnabled: false } as any);
    const prefs = await storage.getUserNotificationPreferences(userId);
    expect(prefs).toBeDefined();
    expect(prefs!.userId).toBe(userId);
    expect(prefs!.soundEnabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Terms and privacy acknowledgment operations
// ---------------------------------------------------------------------------
describe('Terms acknowledgment operations', () => {
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('checkTermsAcknowledgment always returns false for MemoryStorage', async () => {
    const result = await storage.checkTermsAcknowledgment('user-1', '1.0');
    expect(result).toBe(false);
  });

  it('acknowledgeTerms returns a terms acknowledgment object', async () => {
    const ack = await storage.acknowledgeTerms({
      userId: 'user-1',
      version: '2.0',
      ipAddress: '127.0.0.1',
      userAgent: 'Test/1.0',
    } as any);
    expect(ack.id).toBeGreaterThan(0);
    expect(ack.userId).toBe('user-1');
    expect(ack.version).toBe('2.0');
    expect(ack.acknowledgedAt).toBeInstanceOf(Date);
  });

  it('acknowledgeTerms defaults version to 1.0 when not provided', async () => {
    const ack = await storage.acknowledgeTerms({ userId: 'user-2' } as any);
    expect(ack.version).toBe('1.0');
  });
});

// ---------------------------------------------------------------------------
// Additional client info operations
// ---------------------------------------------------------------------------
describe('Additional client info operations', () => {
  let clientId: number;

  beforeEach(async () => {
    storage = new MemoryStorage();
    const client = await storage.createClient(makeClient());
    clientId = client.id;
  });

  it('createClientVehicle assigns id and associates with client', async () => {
    const v = await storage.createClientVehicle({ clientId, make: 'Toyota', model: 'Camry', year: 2022, color: 'Blue' });
    expect(v.id).toBeGreaterThan(0);
    expect(v.clientId).toBe(clientId);
    expect(v.createdAt).toBeInstanceOf(Date);
  });

  it('getClientVehicles returns vehicles for the client', async () => {
    await storage.createClientVehicle({ clientId, make: 'Honda', model: 'Civic' });
    await storage.createClientVehicle({ clientId, make: 'Ford', model: 'F-150' });

    const vehicles = await storage.getClientVehicles(clientId);
    expect(vehicles.length).toBe(2);
  });

  it('getClientVehicles returns empty array for unknown client', async () => {
    const vehicles = await storage.getClientVehicles(99999);
    expect(vehicles).toEqual([]);
  });

  it('createFamilyMember assigns id and associates with client', async () => {
    const fm = await storage.createFamilyMember({ clientId, name: 'Jane Doe', relationship: 'spouse', phoneNumber: '555-1234' });
    expect(fm.id).toBeGreaterThan(0);
    expect(fm.clientId).toBe(clientId);
  });

  it('getClientFamily returns family members for the client', async () => {
    await storage.createFamilyMember({ clientId, name: 'Person A', relationship: 'sibling' });
    const family = await storage.getClientFamily(clientId);
    expect(family.length).toBe(1);
  });

  it('createEmploymentInfo assigns id and associates with client', async () => {
    const emp = await storage.createEmploymentInfo({ clientId, employerName: 'Acme Corp', position: 'Developer' });
    expect(emp.id).toBeGreaterThan(0);
    expect(emp.clientId).toBe(clientId);
  });

  it('getClientEmployment returns employment info for the client', async () => {
    await storage.createEmploymentInfo({ clientId, employerName: 'Acme' });
    const employment = await storage.getClientEmployment(clientId);
    expect(employment.length).toBe(1);
  });

  it('getClientFiles returns empty array for client with no files', async () => {
    const files = await storage.getClientFiles(clientId);
    expect(files).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Arrest monitoring operations (static/stub methods)
// ---------------------------------------------------------------------------
describe('Arrest monitoring operations', () => {
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('getArrestRecords returns empty array', async () => {
    const records = await storage.getArrestRecords();
    expect(records).toEqual([]);
  });

  it('getMonitoringConfig returns 4 Hawaii county configs', async () => {
    const configs = await storage.getMonitoringConfig();
    expect(configs.length).toBe(4);
    expect(configs.map((c: any) => c.county)).toEqual(['honolulu', 'hawaii', 'maui', 'kauai']);
  });

  it('scanArrestLogs returns success result', async () => {
    const result = await storage.scanArrestLogs();
    expect(result.success).toBe(true);
    expect(result.newRecords).toBe(0);
  });

  it('getPublicArrestLogs returns empty array', async () => {
    const logs = await storage.getPublicArrestLogs();
    expect(logs).toEqual([]);
  });

  it('acknowledgeArrestRecord returns an acknowledgment object', async () => {
    const result = await storage.acknowledgeArrestRecord('rec-123');
    expect(result.id).toBe('rec-123');
    expect(result.status).toBe('processed');
  });
});

// ---------------------------------------------------------------------------
// Edge case: auto-incrementing IDs across entity types
// ---------------------------------------------------------------------------
describe('Cross-entity ID auto-increment', () => {
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('IDs are unique across different entity types', async () => {
    const client = await storage.createClient(makeClient());
    const bond = await storage.createBond({ clientId: client.id, companyId: 1, bondAmount: '1000.00', totalOwed: '100.00', remainingBalance: '100.00', status: 'active' } as any);
    const payment = await storage.createPayment({ clientId: client.id, amount: '50.00' } as any);

    const ids = [client.id, bond.id, payment.id];
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
