import * as fs from 'fs/promises';
import * as path from 'path';
import { 
  CompanyConfiguration, 
  InsertCompanyConfiguration,
  StateConfiguration,
  InsertStateConfiguration,
  StatePricing,
  InsertStatePricing,
  BusinessRule,
  InsertBusinessRule,
  Notification,
  InsertNotification
} from '@shared/schema';

export class LocalFileStorage {
  private dataDir = './temp-data';
  private nextId = 1;
  private index: any = {};

  constructor() {
    this.ensureDirectoryExists();
    this.loadIndex();
  }

  private async ensureDirectoryExists() {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'notifications'), { recursive: true });
      await fs.mkdir(path.join(this.dataDir, 'backups'), { recursive: true });
    }
  }

  private async loadIndex() {
    try {
      const indexData = await fs.readFile(path.join(this.dataDir, 'index.json'), 'utf-8');
      this.index = JSON.parse(indexData);
      this.nextId = this.index.nextId || 1;
    } catch {
      this.index = { nextId: 1 };
      await this.saveIndex();
    }
  }

  private async saveIndex() {
    this.index.nextId = this.nextId;
    await fs.writeFile(path.join(this.dataDir, 'index.json'), JSON.stringify(this.index, null, 2));
  }

  private getNextId(): number {
    return this.nextId++;
  }

  async readJsonFile<T>(filename: string, defaultValue: T[] = []): Promise<T[]> {
    try {
      const filePath = path.isAbsolute(filename) ? filename : path.join(this.dataDir, filename);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as T[];
    } catch {
      return defaultValue;
    }
  }

  async writeJsonFile<T>(filename: string, data: T[]): Promise<void> {
    const filePath = path.isAbsolute(filename) ? filename : path.join(this.dataDir, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  get dataDirPath() {
    return this.dataDir;
  }

  // Arrest monitoring operations - only authentic data sources
  async getArrestRecords(): Promise<any[]> {
    return await this.readJsonFile(path.join(this.dataDir, 'arrest-records.json'), []);
  }

  async getMonitoringConfig(): Promise<any[]> {
    const hawaiiCounties = [
      { id: 'honolulu', name: 'Honolulu County', agency: 'Honolulu Police Department' },
      { id: 'hawaii', name: 'Hawaii County', agency: 'Hawaii Police Department' },
      { id: 'maui', name: 'Maui County', agency: 'Maui Police Department' },
      { id: 'kauai', name: 'Kauai County', agency: 'Kauai Police Department' }
    ];

    return hawaiiCounties.map(county => ({
      id: `config-${county.id}`,
      county: county.id,
      agency: county.agency,
      isEnabled: true,
      lastChecked: new Date().toISOString(),
      checkInterval: 30,
      apiEndpoint: `https://api.${county.id}pd.gov/arrest-logs`,
      status: 'requires_configuration'
    }));
  }

  async scanArrestLogs(): Promise<any> {
    return {
      success: false,
      newRecords: 0,
      lastScanned: new Date().toISOString(),
      sourcesChecked: [],
      message: 'Real police department API integration required'
    };
  }

  async acknowledgeArrestRecord(recordId: string): Promise<any> {
    const arrestRecords = await this.readJsonFile(path.join(this.dataDir, 'arrest-records.json'), []);
    const record = arrestRecords.find((r: any) => r.id === recordId);
    
    if (!record) {
      throw new Error('Arrest record not found');
    }
    
    return {
      id: recordId,
      status: 'processed',
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: 'admin'
    };
  }

  async getPublicArrestLogs(): Promise<any[]> {
    // Return only authentic arrest logs from configured data sources
    // No mock data - system requires real police department integration
    return await this.readJsonFile(path.join(this.dataDir, 'public-arrest-logs.json'), []);
  }

  // Notification operations
  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const notification: Notification = {
      id: this.nextId++,
      userId: notificationData.userId,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type,
      priority: notificationData.priority || "medium",
      read: notificationData.read || false,
      confirmed: notificationData.confirmed || false,
      confirmedAt: notificationData.confirmedAt || null,
      confirmedBy: notificationData.confirmedBy || null,
      actionUrl: notificationData.actionUrl || null,
      metadata: notificationData.metadata || null,
      expiresAt: notificationData.expiresAt || null,
      createdAt: new Date(),
    };

    const notifications = await this.readJsonFile<Notification>(path.join(this.dataDir, 'notifications', 'notifications.json'));
    notifications.push(notification);
    await this.writeJsonFile(path.join(this.dataDir, 'notifications', 'notifications.json'), notifications);
    await this.saveIndex();

    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    const notifications = await this.readJsonFile<Notification>(path.join(this.dataDir, 'notifications', 'notifications.json'));
    return notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    const notifications = await this.getUserNotifications(userId);
    return notifications.filter(n => !n.read);
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    const notifications = await this.readJsonFile<Notification>(path.join(this.dataDir, 'notifications', 'notifications.json'));
    const notification = notifications.find(n => n.id === id);
    
    if (!notification) {
      throw new Error(`Notification with id ${id} not found`);
    }

    notification.read = true;
    await this.writeJsonFile(path.join(this.dataDir, 'notifications', 'notifications.json'), notifications);
    
    return notification;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    const notifications = await this.readJsonFile<Notification>(path.join(this.dataDir, 'notifications', 'notifications.json'));
    const updated = notifications.map(n => 
      n.userId === userId ? { ...n, read: true } : n
    );
    await this.writeJsonFile(path.join(this.dataDir, 'notifications', 'notifications.json'), updated);
  }

  async confirmNotification(id: number, confirmedBy: string): Promise<Notification> {
    const notifications = await this.readJsonFile<Notification>(path.join(this.dataDir, 'notifications', 'notifications.json'));
    const notification = notifications.find(n => n.id === id);
    
    if (!notification) {
      throw new Error("Notification not found");
    }
    
    notification.confirmed = true;
    notification.confirmedAt = new Date();
    notification.confirmedBy = confirmedBy;
    
    await this.writeJsonFile(path.join(this.dataDir, 'notifications', 'notifications.json'), notifications);
    
    return notification;
  }

  // Company configuration operations
  async createCompanyConfiguration(configData: InsertCompanyConfiguration): Promise<CompanyConfiguration> {
    const config: CompanyConfiguration = {
      id: this.getNextId(),
      ...configData,
      isActive: configData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const configs = await this.readJsonFile<CompanyConfiguration>('company-configurations.json', []);
    configs.push(config);
    await this.writeJsonFile('company-configurations.json', configs);
    
    return config;
  }

  async getCompanyConfiguration(id: number): Promise<CompanyConfiguration | undefined> {
    const configs = await this.readJsonFile<CompanyConfiguration>('company-configurations.json', []);
    return configs.find(config => config.id === id);
  }

  async updateCompanyConfiguration(id: number, updates: Partial<InsertCompanyConfiguration>): Promise<CompanyConfiguration> {
    const configs = await this.readJsonFile<CompanyConfiguration>('company-configurations.json', []);
    const configIndex = configs.findIndex(config => config.id === id);
    
    if (configIndex === -1) {
      throw new Error('Company configuration not found');
    }

    configs[configIndex] = {
      ...configs[configIndex],
      ...updates,
      updatedAt: new Date(),
    };

    await this.writeJsonFile('company-configurations.json', configs);
    return configs[configIndex];
  }

  async getAllCompanyConfigurations(): Promise<CompanyConfiguration[]> {
    return await this.readJsonFile<CompanyConfiguration>('company-configurations.json', []);
  }

  // State configuration operations
  async createStateConfiguration(configData: InsertStateConfiguration): Promise<StateConfiguration> {
    const config: StateConfiguration = {
      id: this.getNextId(),
      ...configData,
      isActive: configData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const configs = await this.readJsonFile<StateConfiguration>('state-configurations.json', []);
    configs.push(config);
    await this.writeJsonFile('state-configurations.json', configs);
    
    return config;
  }

  async getStateConfiguration(state: string): Promise<StateConfiguration | undefined> {
    const configs = await this.readJsonFile<StateConfiguration>('state-configurations.json', []);
    return configs.find(config => config.state === state);
  }

  async updateStateConfiguration(id: number, updates: Partial<InsertStateConfiguration>): Promise<StateConfiguration> {
    const configs = await this.readJsonFile<StateConfiguration>('state-configurations.json', []);
    const configIndex = configs.findIndex(config => config.id === id);
    
    if (configIndex === -1) {
      throw new Error('State configuration not found');
    }

    configs[configIndex] = {
      ...configs[configIndex],
      ...updates,
      updatedAt: new Date(),
    };

    await this.writeJsonFile('state-configurations.json', configs);
    return configs[configIndex];
  }

  async getAllStateConfigurations(): Promise<StateConfiguration[]> {
    return await this.readJsonFile<StateConfiguration>('state-configurations.json', []);
  }

  // State pricing operations
  async createStatePricing(pricingData: InsertStatePricing): Promise<StatePricing> {
    const pricing: StatePricing = {
      id: this.getNextId(),
      ...pricingData,
      isActive: pricingData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const pricings = await this.readJsonFile<StatePricing>('state-pricing.json', []);
    pricings.push(pricing);
    await this.writeJsonFile('state-pricing.json', pricings);
    
    return pricing;
  }

  async getStatePricing(state: string, bondType?: string): Promise<StatePricing[]> {
    const pricings = await this.readJsonFile<StatePricing>('state-pricing.json', []);
    return pricings.filter(pricing => 
      pricing.state === state &&
      (!bondType || pricing.bondType === bondType) &&
      pricing.isActive
    );
  }

  async updateStatePricing(id: number, updates: Partial<InsertStatePricing>): Promise<StatePricing> {
    const pricings = await this.readJsonFile<StatePricing>('state-pricing.json', []);
    const pricingIndex = pricings.findIndex(pricing => pricing.id === id);
    
    if (pricingIndex === -1) {
      throw new Error('State pricing not found');
    }

    pricings[pricingIndex] = {
      ...pricings[pricingIndex],
      ...updates,
      updatedAt: new Date(),
    };

    await this.writeJsonFile('state-pricing.json', pricings);
    return pricings[pricingIndex];
  }

  async deleteStatePricing(id: number): Promise<void> {
    const pricings = await this.readJsonFile<StatePricing>('state-pricing.json', []);
    const filteredPricings = pricings.filter(pricing => pricing.id !== id);
    await this.writeJsonFile('state-pricing.json', filteredPricings);
  }

  // Business rules operations
  async createBusinessRule(ruleData: InsertBusinessRule): Promise<BusinessRule> {
    const rule: BusinessRule = {
      id: this.getNextId(),
      ...ruleData,
      priority: ruleData.priority ?? 0,
      isActive: ruleData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const rules = await this.readJsonFile<BusinessRule>('business-rules.json', []);
    rules.push(rule);
    await this.writeJsonFile('business-rules.json', rules);
    
    return rule;
  }

  async getBusinessRules(companyId: number, ruleType?: string): Promise<BusinessRule[]> {
    const rules = await this.readJsonFile<BusinessRule>('business-rules.json', []);
    return rules.filter(rule => 
      rule.companyId === companyId &&
      (!ruleType || rule.ruleType === ruleType) &&
      rule.isActive
    ).sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  async updateBusinessRule(id: number, updates: Partial<InsertBusinessRule>): Promise<BusinessRule> {
    const rules = await this.readJsonFile<BusinessRule>('business-rules.json', []);
    const ruleIndex = rules.findIndex(rule => rule.id === id);
    
    if (ruleIndex === -1) {
      throw new Error('Business rule not found');
    }

    rules[ruleIndex] = {
      ...rules[ruleIndex],
      ...updates,
      updatedAt: new Date(),
    };

    await this.writeJsonFile('business-rules.json', rules);
    return rules[ruleIndex];
  }

  async deleteBusinessRule(id: number): Promise<void> {
    const rules = await this.readJsonFile<BusinessRule>('business-rules.json', []);
    const filteredRules = rules.filter(rule => rule.id !== id);
    await this.writeJsonFile('business-rules.json', filteredRules);
  }

  // Required methods for IStorage interface
  async getUser(id: string): Promise<any> {
    const users = await this.readJsonFile('users.json', []);
    return users.find((u: any) => u.id === id);
  }

  async upsertUser(user: any): Promise<any> {
    const users = await this.readJsonFile('users.json', []);
    const existingIndex = users.findIndex((u: any) => u.id === user.id);
    
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...user };
      await this.writeJsonFile('users.json', users);
      return users[existingIndex];
    } else {
      const newUser = { ...user, createdAt: new Date() };
      users.push(newUser);
      await this.writeJsonFile('users.json', users);
      return newUser;
    }
  }

  // Staff management operations
  async createStaff(staffData: any): Promise<any> {
    const staff = await this.readJsonFile('staff.json', []);
    const newStaff = {
      id: this.getNextId(),
      employeeId: `EMP-${Date.now()}`,
      ...staffData,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    staff.push(newStaff);
    await this.writeJsonFile('staff.json', staff);
    await this.saveIndex();
    return newStaff;
  }

  async getAllStaff(): Promise<any[]> {
    return await this.readJsonFile('staff.json', []);
  }

  async getStaff(id: number): Promise<any> {
    const staff = await this.readJsonFile('staff.json', []);
    return staff.find((s: any) => s.id === id);
  }

  async updateStaff(id: number, updates: any): Promise<any> {
    const staff = await this.readJsonFile('staff.json', []);
    const staffIndex = staff.findIndex((s: any) => s.id === id);
    if (staffIndex === -1) throw new Error('Staff member not found');
    
    staff[staffIndex] = { ...staff[staffIndex], ...updates, updatedAt: new Date() };
    await this.writeJsonFile('staff.json', staff);
    return staff[staffIndex];
  }

  async deleteStaff(id: number): Promise<void> {
    const staff = await this.readJsonFile('staff.json', []);
    const filteredStaff = staff.filter((s: any) => s.id !== id);
    await this.writeJsonFile('staff.json', filteredStaff);
  }

  // User credential management
  async createUserCredential(credentialData: any): Promise<any> {
    const credentials = await this.readJsonFile('user-credentials.json', []);
    const newCredential = {
      id: this.getNextId(),
      username: credentialData.username || `user${Date.now()}`,
      temporaryPassword: credentialData.temporaryPassword,
      activationToken: credentialData.activationToken || `token_${Date.now()}`,
      activationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      ...credentialData,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    credentials.push(newCredential);
    await this.writeJsonFile('user-credentials.json', credentials);
    await this.saveIndex();
    return newCredential;
  }

  async getUserCredential(username: string): Promise<any> {
    const credentials = await this.readJsonFile('user-credentials.json', []);
    return credentials.find((c: any) => c.username === username);
  }

  async updateUserCredential(id: number, updates: any): Promise<any> {
    const credentials = await this.readJsonFile('user-credentials.json', []);
    const credIndex = credentials.findIndex((c: any) => c.id === id);
    if (credIndex === -1) throw new Error('User credential not found');
    
    credentials[credIndex] = { ...credentials[credIndex], ...updates, updatedAt: new Date() };
    await this.writeJsonFile('user-credentials.json', credentials);
    return credentials[credIndex];
  }

  async activateUserAccount(token: string, newPassword: string): Promise<any> {
    const credentials = await this.readJsonFile('user-credentials.json', []);
    const credential = credentials.find((c: any) => c.activationToken === token);
    
    if (!credential) {
      throw new Error('Invalid activation token');
    }
    
    if (new Date() > new Date(credential.activationTokenExpires)) {
      throw new Error('Activation token has expired');
    }
    
    const updatedCredential = {
      ...credential,
      permanentPassword: newPassword,
      passwordResetRequired: false,
      activationToken: null,
      activationTokenExpires: null,
      updatedAt: new Date()
    };
    
    const credIndex = credentials.findIndex((c: any) => c.id === credential.id);
    credentials[credIndex] = updatedCredential;
    await this.writeJsonFile('user-credentials.json', credentials);
    
    return updatedCredential;
  }

  async getClient(id: number): Promise<any> {
    const clients = await this.readJsonFile('clients.json', []);
    return clients.find((c: any) => c.id === id);
  }

  async getClientByClientId(clientId: string): Promise<any> {
    const clients = await this.readJsonFile('clients.json', []);
    return clients.find((c: any) => c.clientId === clientId);
  }

  async getAllClients(): Promise<any[]> {
    return await this.readJsonFile('clients.json', []);
  }

  async createClient(client: any): Promise<any> {
    const clients = await this.readJsonFile('clients.json', []);
    const newClient = { ...client, id: this.nextId++, createdAt: new Date() };
    clients.push(newClient);
    await this.writeJsonFile('clients.json', clients);
    await this.saveIndex();
    return newClient;
  }

  async updateClient(id: number, updates: any): Promise<any> {
    const clients = await this.readJsonFile('clients.json', []);
    const clientIndex = clients.findIndex((c: any) => c.id === id);
    if (clientIndex === -1) throw new Error('Client not found');
    
    clients[clientIndex] = { ...clients[clientIndex], ...updates, updatedAt: new Date() };
    await this.writeJsonFile('clients.json', clients);
    return clients[clientIndex];
  }

  async deleteClient(id: number): Promise<void> {
    const clients = await this.readJsonFile('clients.json', []);
    const filteredClients = clients.filter((c: any) => c.id !== id);
    await this.writeJsonFile('clients.json', filteredClients);
  }

  async getAllBonds(): Promise<any[]> {
    return await this.readJsonFile('bonds.json', []);
  }

  async createBond(bond: any): Promise<any> {
    const bonds = await this.readJsonFile('bonds.json', []);
    const newBond = { ...bond, id: this.nextId++, createdAt: new Date() };
    bonds.push(newBond);
    await this.writeJsonFile('bonds.json', bonds);
    await this.saveIndex();
    return newBond;
  }

  async getClientBonds(clientId: number): Promise<any[]> {
    const bonds = await this.readJsonFile('bonds.json', []);
    return bonds.filter((b: any) => b.clientId === clientId);
  }

  async updateBond(id: number, updates: any): Promise<any> {
    const bonds = await this.readJsonFile('bonds.json', []);
    const bondIndex = bonds.findIndex((b: any) => b.id === id);
    if (bondIndex === -1) throw new Error('Bond not found');
    
    bonds[bondIndex] = { ...bonds[bondIndex], ...updates, updatedAt: new Date() };
    await this.writeJsonFile('bonds.json', bonds);
    return bonds[bondIndex];
  }

  async deleteBond(id: number): Promise<void> {
    const bonds = await this.readJsonFile('bonds.json', []);
    const filteredBonds = bonds.filter((b: any) => b.id !== id);
    await this.writeJsonFile('bonds.json', filteredBonds);
  }

  async getBondById(id: number): Promise<any> {
    const bonds = await this.readJsonFile('bonds.json', []);
    return bonds.find((b: any) => b.id === id);
  }

  async updateBondStatus(id: number, updates: any): Promise<any> {
    return this.updateBond(id, updates);
  }

  async getActiveBonds(): Promise<any[]> {
    const bonds = await this.readJsonFile('bonds.json', []);
    return bonds.filter((b: any) => b.status === 'active');
  }

  async getClientActiveBondCount(clientId: number): Promise<number> {
    const bonds = await this.getActiveBonds();
    return bonds.filter((b: any) => b.clientId === clientId).length;
  }

  async createCheckIn(checkIn: any): Promise<any> {
    const checkIns = await this.readJsonFile('check-ins.json', []);
    const newCheckIn = { ...checkIn, id: this.nextId++, createdAt: new Date() };
    checkIns.push(newCheckIn);
    await this.writeJsonFile('check-ins.json', checkIns);
    await this.saveIndex();
    return newCheckIn;
  }

  async getClientCheckIns(clientId: number): Promise<any[]> {
    const checkIns = await this.readJsonFile('check-ins.json', []);
    return checkIns.filter((ci: any) => ci.clientId === clientId);
  }

  async getAllCheckIns(): Promise<any[]> {
    return await this.readJsonFile('check-ins.json', []);
  }

  async getLastCheckIn(clientId: number): Promise<any> {
    const checkIns = await this.getClientCheckIns(clientId);
    return checkIns.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }

  async deleteCheckIn(id: number): Promise<void> {
    const checkIns = await this.readJsonFile('check-ins.json', []);
    const filteredCheckIns = checkIns.filter((ci: any) => ci.id !== id);
    await this.writeJsonFile('check-ins.json', filteredCheckIns);
  }

  async createPayment(payment: any): Promise<any> {
    const payments = await this.readJsonFile('payments.json', []);
    const newPayment = { ...payment, id: this.nextId++, createdAt: new Date() };
    payments.push(newPayment);
    await this.writeJsonFile('payments.json', payments);
    await this.saveIndex();
    return newPayment;
  }

  async getClientPayments(clientId: number): Promise<any[]> {
    const payments = await this.readJsonFile('payments.json', []);
    return payments.filter((p: any) => p.clientId === clientId);
  }

  async getAllPayments(): Promise<any[]> {
    return await this.readJsonFile('payments.json', []);
  }

  async confirmPayment(id: number, confirmedBy: string): Promise<any> {
    return this.updatePayment(id, { confirmed: true, confirmedBy, confirmedAt: new Date() });
  }

  async updatePayment(id: number, updates: any): Promise<any> {
    const payments = await this.readJsonFile('payments.json', []);
    const paymentIndex = payments.findIndex((p: any) => p.id === id);
    if (paymentIndex === -1) throw new Error('Payment not found');
    
    payments[paymentIndex] = { ...payments[paymentIndex], ...updates, updatedAt: new Date() };
    await this.writeJsonFile('payments.json', payments);
    return payments[paymentIndex];
  }

  async deletePayment(id: number): Promise<void> {
    const payments = await this.readJsonFile('payments.json', []);
    const filteredPayments = payments.filter((p: any) => p.id !== id);
    await this.writeJsonFile('payments.json', filteredPayments);
  }

  async createMessage(message: any): Promise<any> {
    const messages = await this.readJsonFile('messages.json', []);
    const newMessage = { ...message, id: this.nextId++, createdAt: new Date() };
    messages.push(newMessage);
    await this.writeJsonFile('messages.json', messages);
    await this.saveIndex();
    return newMessage;
  }

  async getClientMessages(clientId: number): Promise<any[]> {
    const messages = await this.readJsonFile('messages.json', []);
    return messages.filter((m: any) => m.clientId === clientId);
  }

  async markMessageAsRead(id: number): Promise<void> {
    const messages = await this.readJsonFile('messages.json', []);
    const messageIndex = messages.findIndex((m: any) => m.id === id);
    if (messageIndex >= 0) {
      messages[messageIndex].isRead = true;
      messages[messageIndex].readAt = new Date();
      await this.writeJsonFile('messages.json', messages);
    }
  }

  async createCourtDate(courtDate: any): Promise<any> {
    const courtDates = await this.readJsonFile('court-dates.json', []);
    const newCourtDate = { ...courtDate, id: this.nextId++, createdAt: new Date() };
    courtDates.push(newCourtDate);
    await this.writeJsonFile('court-dates.json', courtDates);
    await this.saveIndex();
    return newCourtDate;
  }

  async getClientCourtDates(clientId: number): Promise<any[]> {
    const courtDates = await this.readJsonFile('court-dates.json', []);
    return courtDates.filter((cd: any) => cd.clientId === clientId);
  }

  async getAllCourtDates(): Promise<any[]> {
    return await this.readJsonFile('court-dates.json', []);
  }

  async getAllUpcomingCourtDates(): Promise<any[]> {
    const courtDates = await this.getAllCourtDates();
    const now = new Date();
    return courtDates.filter((cd: any) => new Date(cd.date) > now);
  }

  async updateCourtDate(id: number, updates: any): Promise<any> {
    const courtDates = await this.readJsonFile('court-dates.json', []);
    const courtDateIndex = courtDates.findIndex((cd: any) => cd.id === id);
    if (courtDateIndex === -1) throw new Error('Court date not found');
    
    courtDates[courtDateIndex] = { ...courtDates[courtDateIndex], ...updates, updatedAt: new Date() };
    await this.writeJsonFile('court-dates.json', courtDates);
    return courtDates[courtDateIndex];
  }

  async deleteCourtDate(id: number): Promise<void> {
    const courtDates = await this.readJsonFile('court-dates.json', []);
    const filteredCourtDates = courtDates.filter((cd: any) => cd.id !== id);
    await this.writeJsonFile('court-dates.json', filteredCourtDates);
  }

  async approveCourtDate(id: number, approvedBy: string): Promise<any> {
    return this.updateCourtDate(id, { approved: true, approvedBy, approvedAt: new Date() });
  }

  async getPendingCourtDates(): Promise<any[]> {
    const courtDates = await this.getAllCourtDates();
    return courtDates.filter((cd: any) => !cd.approved);
  }

  async acknowledgeCourtDate(id: number, clientId: number): Promise<any> {
    return this.updateCourtDate(id, { acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: clientId });
  }

  async createExpense(expense: any): Promise<any> {
    const expenses = await this.readJsonFile('expenses.json', []);
    const newExpense = { ...expense, id: this.nextId++, createdAt: new Date() };
    expenses.push(newExpense);
    await this.writeJsonFile('expenses.json', expenses);
    await this.saveIndex();
    return newExpense;
  }

  async getAllExpenses(): Promise<any[]> {
    return await this.readJsonFile('expenses.json', []);
  }

  async createAlert(alert: any): Promise<any> {
    const alerts = await this.readJsonFile('alerts.json', []);
    const newAlert = { ...alert, id: this.nextId++, createdAt: new Date() };
    alerts.push(newAlert);
    await this.writeJsonFile('alerts.json', alerts);
    await this.saveIndex();
    return newAlert;
  }

  async getAllAlerts(): Promise<any[]> {
    return await this.readJsonFile('alerts.json', []);
  }

  async getAllUnacknowledgedAlerts(): Promise<any[]> {
    const alerts = await this.readJsonFile('alerts.json', []);
    return alerts.filter((a: any) => !a.acknowledged);
  }

  async acknowledgeAlert(id: number): Promise<void> {
    const alerts = await this.readJsonFile('alerts.json', []);
    const alertIndex = alerts.findIndex((a: any) => a.id === id);
    if (alertIndex >= 0) {
      alerts[alertIndex].acknowledged = true;
      alerts[alertIndex].acknowledgedAt = new Date();
      await this.writeJsonFile('alerts.json', alerts);
    }
  }

  // Duplicate methods removed - using primary implementations above

  async getDashboardStats(): Promise<any> {
    const clients = await this.getAllClients();
    const bonds = await this.getAllBonds();
    const payments = await this.getAllPayments();
    const alerts = await this.getAllUnacknowledgedAlerts();

    return {
      totalClients: clients.length,
      activeBonds: bonds.filter((b: any) => b.status === 'active').length,
      totalRevenue: payments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0),
      pendingAlerts: alerts.length
    };
  }

  async getClientLocations(): Promise<any[]> {
    return await this.readJsonFile('client-locations.json', []);
  }

  // Payment plan operations
  async getPaymentPlans(bondId?: number): Promise<any[]> {
    const plans = await this.readJsonFile('payment-plans.json', []);
    if (bondId !== undefined) {
      return plans.filter((p: any) => p.bondId === bondId);
    }
    return plans;
  }

  async createPaymentPlan(plan: any): Promise<any> {
    const plans = await this.readJsonFile('payment-plans.json', []);
    const newPlan = { ...plan, id: this.nextId++, createdAt: new Date() };
    plans.push(newPlan);
    await this.writeJsonFile('payment-plans.json', plans);
    await this.saveIndex();
    return newPlan;
  }

  async getPaymentInstallments(planId: number): Promise<any[]> {
    const installments = await this.readJsonFile('payment-installments.json', []);
    return installments.filter((i: any) => i.planId === planId);
  }

  // Collections operations
  async getCollectionsActivities(filters: any): Promise<any[]> {
    const activities = await this.readJsonFile('collections-activities.json', []);
    if (!filters) return activities;
    return activities.filter((a: any) => {
      if (filters.bondId && a.bondId !== filters.bondId) return false;
      if (filters.clientId && a.clientId !== filters.clientId) return false;
      if (filters.status && a.status !== filters.status) return false;
      return true;
    });
  }

  async createCollectionsActivity(activity: any): Promise<any> {
    const activities = await this.readJsonFile('collections-activities.json', []);
    const newActivity = { ...activity, id: this.nextId++, createdAt: new Date() };
    activities.push(newActivity);
    await this.writeJsonFile('collections-activities.json', activities);
    await this.saveIndex();
    return newActivity;
  }

  // Forfeiture operations
  async getForfeitures(filters: any): Promise<any[]> {
    const forfeitures = await this.readJsonFile('forfeitures.json', []);
    if (!filters) return forfeitures;
    return forfeitures.filter((f: any) => {
      if (filters.bondId && f.bondId !== filters.bondId) return false;
      if (filters.clientId && f.clientId !== filters.clientId) return false;
      if (filters.status && f.status !== filters.status) return false;
      return true;
    });
  }

  async createForfeiture(forfeiture: any): Promise<any> {
    const forfeitures = await this.readJsonFile('forfeitures.json', []);
    const newForfeiture = { ...forfeiture, id: this.nextId++, createdAt: new Date() };
    forfeitures.push(newForfeiture);
    await this.writeJsonFile('forfeitures.json', forfeitures);
    await this.saveIndex();
    return newForfeiture;
  }

  // User role operations
  async getUserRoles(): Promise<any[]> {
    return await this.readJsonFile('user-roles.json', []);
  }

  async createUserRole(role: any): Promise<any> {
    const roles = await this.readJsonFile('user-roles.json', []);
    const newRole = { ...role, id: this.nextId++, createdAt: new Date() };
    roles.push(newRole);
    await this.writeJsonFile('user-roles.json', roles);
    await this.saveIndex();
    return newRole;
  }

  // Data backup operations
  async getDataBackups(): Promise<any[]> {
    return await this.readJsonFile('data-backups.json', []);
  }

  async createDataBackup(backup: any): Promise<any> {
    const backups = await this.readJsonFile('data-backups.json', []);
    const newBackup = { ...backup, id: this.nextId++, createdAt: new Date() };
    backups.push(newBackup);
    await this.writeJsonFile('data-backups.json', backups);
    await this.saveIndex();
    return newBackup;
  }

  // Notification preference operations
  async getUserNotificationPreferences(userId: string): Promise<any> {
    const prefs = await this.readJsonFile('notification-preferences.json', []);
    return prefs.find((p: any) => p.userId === userId) || {};
  }

  async upsertNotificationPreferences(preferences: any): Promise<any> {
    const prefs = await this.readJsonFile('notification-preferences.json', []);
    const existingIndex = prefs.findIndex((p: any) => p.userId === preferences.userId);

    if (existingIndex >= 0) {
      prefs[existingIndex] = { ...prefs[existingIndex], ...preferences, updatedAt: new Date() };
      await this.writeJsonFile('notification-preferences.json', prefs);
      return prefs[existingIndex];
    } else {
      const newPref = { ...preferences, id: this.nextId++, createdAt: new Date() };
      prefs.push(newPref);
      await this.writeJsonFile('notification-preferences.json', prefs);
      await this.saveIndex();
      return newPref;
    }
  }

  async deleteNotification(id: number): Promise<void> {
    const notifications = await this.readJsonFile(path.join(this.dataDir, 'notifications', 'notifications.json'), []);
    const filtered = notifications.filter((n: any) => n.id !== id);
    await this.writeJsonFile(path.join(this.dataDir, 'notifications', 'notifications.json'), filtered);
  }

  // Terms acknowledgment operations
  async checkTermsAcknowledgment(userId: string): Promise<any> {
    const acknowledgments = await this.readJsonFile('terms-acknowledgments.json', []);
    return acknowledgments.find((a: any) => a.userId === userId) || null;
  }

  async acknowledgeTerms(acknowledgment: any): Promise<any> {
    const acknowledgments = await this.readJsonFile('terms-acknowledgments.json', []);
    const newAck = { ...acknowledgment, id: this.nextId++, createdAt: new Date() };
    acknowledgments.push(newAck);
    await this.writeJsonFile('terms-acknowledgments.json', acknowledgments);
    await this.saveIndex();
    return newAck;
  }

  // Client vehicle operations
  async getClientVehicles(clientId: number): Promise<any[]> {
    const vehicles = await this.readJsonFile('client-vehicles.json', []);
    return vehicles.filter((v: any) => v.clientId === clientId);
  }

  async createClientVehicle(vehicle: any): Promise<any> {
    const vehicles = await this.readJsonFile('client-vehicles.json', []);
    const newVehicle = { ...vehicle, id: this.nextId++, createdAt: new Date() };
    vehicles.push(newVehicle);
    await this.writeJsonFile('client-vehicles.json', vehicles);
    await this.saveIndex();
    return newVehicle;
  }

  // Family member operations
  async createFamilyMember(family: any): Promise<any> {
    const members = await this.readJsonFile('family-members.json', []);
    const newMember = { ...family, id: this.nextId++, createdAt: new Date() };
    members.push(newMember);
    await this.writeJsonFile('family-members.json', members);
    await this.saveIndex();
    return newMember;
  }

  // Employment info operations
  async createEmploymentInfo(employment: any): Promise<any> {
    const records = await this.readJsonFile('employment-info.json', []);
    const newRecord = { ...employment, id: this.nextId++, createdAt: new Date() };
    records.push(newRecord);
    await this.writeJsonFile('employment-info.json', records);
    await this.saveIndex();
    return newRecord;
  }

  // Client files operations
  async getClientFiles(clientId: number): Promise<any[]> {
    const files = await this.readJsonFile('client-files.json', []);
    return files.filter((f: any) => f.clientId === clientId);
  }

  // Court date reminder operations
  async createCourtDateReminder(reminder: any): Promise<any> {
    const reminders = await this.readJsonFile('court-date-reminders.json', []);
    const newReminder = { ...reminder, id: this.nextId++, createdAt: new Date() };
    reminders.push(newReminder);
    await this.writeJsonFile('court-date-reminders.json', reminders);
    await this.saveIndex();
    return newReminder;
  }

  async getCourtDateReminders(): Promise<any[]> {
    return await this.readJsonFile('court-date-reminders.json', []);
  }

  async acknowledgeReminder(reminderId: string): Promise<any> {
    const reminders = await this.readJsonFile('court-date-reminders.json', []);
    const reminderIndex = reminders.findIndex((r: any) => r.id === reminderId || r.id === parseInt(reminderId));
    if (reminderIndex === -1) throw new Error('Reminder not found');

    reminders[reminderIndex] = { ...reminders[reminderIndex], acknowledged: true, acknowledgedAt: new Date() };
    await this.writeJsonFile('court-date-reminders.json', reminders);
    return reminders[reminderIndex];
  }

  async getClientApprovedCourtDates(clientId: number): Promise<any[]> {
    const courtDates = await this.readJsonFile('court-dates.json', []);
    return courtDates.filter((cd: any) => cd.clientId === clientId && cd.approved);
  }

  // Privacy acknowledgment operations
  async getPrivacyAcknowledgment(userId: string): Promise<any> {
    const acknowledgments = await this.readJsonFile('privacy-acknowledgments.json', []);
    return acknowledgments.find((a: any) => a.userId === userId) || null;
  }

  async createPrivacyAcknowledgment(acknowledgment: any): Promise<any> {
    const acknowledgments = await this.readJsonFile('privacy-acknowledgments.json', []);
    const newAck = { ...acknowledgment, id: this.nextId++, createdAt: new Date() };
    acknowledgments.push(newAck);
    await this.writeJsonFile('privacy-acknowledgments.json', acknowledgments);
    await this.saveIndex();
    return newAck;
  }

  // Client family and employment lookups
  async getClientFamily(clientId: number): Promise<any[]> {
    const members = await this.readJsonFile('family-members.json', []);
    return members.filter((m: any) => m.clientId === clientId);
  }

  async getClientEmployment(clientId: number): Promise<any[]> {
    const records = await this.readJsonFile('employment-info.json', []);
    return records.filter((r: any) => r.clientId === clientId);
  }
}

export const storage = new LocalFileStorage();