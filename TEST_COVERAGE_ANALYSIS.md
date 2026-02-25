# Test Coverage Analysis — BondDashboard

## Current State

**Test files: 0 / 175 source files — 0% test coverage**

The codebase has no testing framework installed, no test configuration, and no test files. The `tsconfig.json` excludes `**/*.test.ts`, suggesting tests were planned but never implemented.

---

## Recommended Testing Framework Setup

Given the existing stack (Vite, React 18, Express, TypeScript), the recommended testing setup is:

| Layer | Framework | Why |
|-------|-----------|-----|
| Unit tests (server) | Vitest | Native ESM support, same Vite config, fast |
| Unit tests (client) | Vitest + React Testing Library | Standard for React 18, integrates with Vite |
| API / integration tests | Vitest + Supertest | Test Express routes end-to-end without a running server |
| E2E (future) | Playwright | Cross-browser, works well with Vite dev server |

---

## Priority Areas for Test Coverage

The following areas are ranked by **risk** (what breaks hardest when it fails) and **feasibility** (how testable the code is today).

### Priority 1 — Critical Business Logic (Server)

#### 1.1 Storage Layer (`server/storage.ts`, `server/local-db.ts`)
- **Risk:** Every API route depends on `IStorage`. A bug here corrupts or loses client/bond/payment data.
- **What to test:**
  - CRUD operations for every entity (clients, bonds, payments, check-ins, court dates, expenses, alerts, notifications)
  - Edge cases: duplicate `clientId`, deleting a client with active bonds, confirming a payment twice
  - `getDashboardStats()` aggregation correctness
  - `getActiveBonds()` filtering logic
- **Estimated tests:** 40–60

#### 1.2 Authentication & Authorization (`server/routes.ts:57-68`, `server/middleware/auth.ts`)
- **Risk:** Broken auth means unauthorized access to sensitive PII (names, addresses, court records, financial data). This is a bail bond management system — the data is legally sensitive.
- **What to test:**
  - `isAuthenticated` middleware: allow admin sessions, client sessions, Replit Auth; reject unauthenticated
  - `requireRole`: enforce role-based access (admin vs. client vs. maintenance)
  - `requireAnyRole`: multi-role checks
  - Session handling: expired sessions, destroyed sessions
  - The `/api/auth/user` endpoint returning correct shape for admin, client, and Replit Auth users
  - The `/api/auth/client` endpoint exposing only safe fields (no password hash)
- **Estimated tests:** 15–20

#### 1.3 Input Validation (`server/middleware/validation.ts`, Zod schemas in `shared/schema.ts`)
- **Risk:** Invalid data reaching the database or causing runtime errors. The codebase has Zod schemas but **the validation middleware is commented out in `routes.ts:35-37`** — this makes testing even more important to identify what validation is actually being enforced.
- **What to test:**
  - `validateBody`, `validateQuery`, `validateParams` middleware functions with valid and invalid payloads
  - Each Zod insert schema (`insertClientSchema`, `insertBondSchema`, etc.) with edge-case data
  - Confirm that `req.body` is replaced with the parsed (sanitized) result, not the raw input
- **Estimated tests:** 20–30

### Priority 2 — Business-Critical Services (Server)

#### 2.1 Court Reminder Service (`server/courtReminderService.ts`)
- **Risk:** Missed court dates have serious legal consequences for clients (warrants, bond forfeiture). This service is the core safety net.
- **What to test:**
  - `scheduleReminders()`: correct reminder dates (7, 3, 1, 0 days before), skip past dates
  - `processPendingReminders()`: sends only unsent reminders, handles errors per-reminder
  - `getUpcomingCourtDates()`: correct filtering by date range, enrichment with client data
  - `getOverdueCourtDates()`: identifies past-due dates, calculates `daysOverdue`
  - `getReminderPriority()`: correct priority escalation (medium → high → urgent)
- **Estimated tests:** 15–20

#### 2.2 Notification Service (`server/services/notificationService.ts`)
- **Risk:** Notification failures mean clients miss court dates or payment deadlines.
- **What to test:**
  - `sendCourtDateReminder()`: calls SMS provider and email service, creates DB record
  - `formatCourtReminderMessage()`: correct string formatting for each reminder type
  - `getReminderSubject()`: correct subjects per urgency level
  - Error handling: SMS failure shouldn't prevent email send or DB record creation
  - `sendPaymentReminder()` and `sendCheckInReminder()`: message formatting
- **Estimated tests:** 10–15

#### 2.3 Geolocation Service (`server/services/geolocationService.ts`)
- **Risk:** Location tracking is used for bail compliance monitoring. False positives/negatives on jurisdiction checks can have legal consequences.
- **What to test:**
  - `validateLocation()`: boundary conditions for Hawaii coordinate ranges
  - `trackClientLocation()`: handles both GPS and cell tower inputs, flags out-of-jurisdiction
  - `getCellTowerLocation()`: handles API errors, subscription-required errors
  - `getLocationFromGPS()`: returns correct format
- **Estimated tests:** 10–12

### Priority 3 — Security Middleware (Server)

#### 3.1 Security Middleware (`server/middleware/security.ts`)
- **Risk:** These are currently **commented out** in the main routes file (`routes.ts:72-74`). Tests would both verify correctness and serve as documentation for re-enabling them.
- **What to test:**
  - `loginRateLimit`: blocks after 5 attempts in 15 minutes
  - `apiRateLimit`: blocks after 100 requests per minute
  - `securityHeaders`: all headers set correctly (X-Content-Type-Options, X-Frame-Options, etc.)
  - `sanitizeInput`: strips `<script>` tags, `javascript:` URIs, inline event handlers from body, query, and params
  - **Important:** the `sanitizeInput` regex-based approach has known bypass vectors (e.g., `<img src=x onerror=...>` would not be caught). Tests should document these gaps.
- **Estimated tests:** 10–15

#### 3.2 Audit Middleware (`server/middleware/audit.ts`, `server/utils/auditLogger.ts`)
- **What to test:** Audit log creation, sensitive data access logging, log format consistency
- **Estimated tests:** 5–8

### Priority 4 — Client-Side Logic

#### 4.1 API Client (`client/src/lib/api.ts`, `client/src/lib/queryClient.ts`)
- **Risk:** Incorrect error handling means silent failures or leaked auth state.
- **What to test:**
  - `apiCall()`: sets credentials, handles 401 by invalidating auth cache, parses error messages
  - `throwIfResNotOk()`: throws on non-2xx responses
  - `getQueryFn()`: returns `null` on 401 when configured to `returnNull`
  - `ApiError` class: correct `status` and `message` propagation
- **Estimated tests:** 8–10

#### 4.2 Auth Hook (`client/src/hooks/useAuth.ts`)
- **What to test:**
  - Returns correct role flags (`isAdmin`, `isClient`, `isMaintenance`)
  - Retry logic: does not retry on 401
  - `logout()`: calls API, clears query cache, redirects
- **Estimated tests:** 5–8

#### 4.3 Custom Hooks (`client/src/hooks/`)
- **What to test:** `useApiEndpoints`, `usePrivacyAcknowledgment`, `useTermsStatus`, `use-mobile` — each with mocked API responses
- **Estimated tests:** 8–12

### Priority 5 — Court Scraper & Arrest Monitoring

#### 5.1 Court Date Scraper (`server/courtScraper.ts`)
- **What to test:**
  - `parseClientName()`: handles single names, middle names, extra whitespace
  - `parseRSSFeed()`: parses real RSS XML, extracts case numbers, matches client names
  - `validateCourtDate()`: name matching logic
  - `searchArrestLogs()`: handles disabled sources, rate limiting, error accumulation
- **Estimated tests:** 10–15

#### 5.2 Arrest Log Scraper (`server/services/arrestLogScraper.ts`)
- **What to test:**
  - `determineSeverity()`: correct classification for different charge types
  - `scrapeHonoluluPD()`: handles HTTP errors, timeouts, malformed HTML gracefully
- **Estimated tests:** 5–8

### Priority 6 — React Components (Selective)

Full component test coverage isn't practical for 90+ custom components, but these warrant testing:

| Component | Why |
|-----------|-----|
| `ProtectedRoute` | Guards access to admin/client pages |
| `ErrorBoundary` / `ErrorContextProvider` | Error recovery paths |
| `check-in-form` | Client-facing data entry, validation |
| `payment-upload` | Financial data handling |
| `bond-form` / `new-client-form` | Core data entry forms |
| `DataTable` | Used across many admin views |
| `InitialPrivacyConsent` / `ComplianceFramework` | Legal compliance UI |

- **Estimated tests:** 20–30

---

## Summary Table

| Priority | Area | Estimated Tests | Impact |
|----------|------|----------------|--------|
| P1 | Storage, Auth, Validation | 75–110 | Data integrity, security |
| P2 | Court Reminders, Notifications, Geolocation | 35–47 | Legal compliance, client safety |
| P3 | Security middleware, Audit | 15–23 | Security posture |
| P4 | Client API, Hooks | 21–30 | Frontend reliability |
| P5 | Scrapers | 15–23 | Data accuracy |
| P6 | Key React Components | 20–30 | UI correctness |
| **Total** | | **181–263** | |

---

## Key Findings & Risks

1. **Security middleware is disabled.** `routes.ts:72-74` has `securityHeaders`, `sanitizeInput`, and `apiRateLimit` commented out. Tests should be written against these before re-enabling.

2. **No validation on most routes.** The validation middleware exists but is commented out (`routes.ts:35-37`). Routes currently accept unsanitized input directly.

3. **Session secret is predictable in development.** `routes.ts:78` falls back to `'aloha-bail-bond-secret-key-' + Date.now()` — this is guessable. A test should verify that `SESSION_SECRET` env var is required in production.

4. **The `sanitizeInput` function has bypass vectors.** The regex in `security.ts:43-47` only strips `<script>` tags, `javascript:` URIs, and `on*=` attributes. It does not handle `<img onerror>`, `<svg onload>`, data URIs, or encoded payloads. Tests should document these gaps.

5. **Duplicate `isAuthenticated` definitions.** There is one in `routes.ts:58` and another in `routes/admin.ts:7`. They have slightly different logic. Tests should verify both behave identically for the same session states.

6. **Silent error swallowing.** `notificationService.ts` catches errors in multiple places with empty catch blocks (lines 36-38, 52-54, 163-165). Tests should verify that partial failures don't silently drop notifications.

---

## Recommended Next Steps

1. Install Vitest, React Testing Library, and Supertest as dev dependencies
2. Create `vitest.config.ts` with separate projects for server and client
3. Start with P1 tests (storage layer and auth) — these provide the highest risk reduction
4. Add a `test` script to `package.json` and integrate into CI
5. Target 80% coverage on P1–P3 areas within the first testing sprint
