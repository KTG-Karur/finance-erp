---
name: fastify-backend
description: Development of Fastify backend API routes, schema validation, auth guards, plugin registration, and domain separation under src/finance and src/gold.
---

# Fastify Backend Skill

## Server Architecture & Directory Layout
```text
server/src/
├── finance/             # General Finance Engine
│   ├── loan/            # Loan lifecycle, EMI schedules
│   ├── ledger/          # General Ledger & double-entry accounting
│   ├── borrower/        # Borrower & KYC masters
│   ├── collection/      # Repayments & collection registers
│   ├── npa/             # NPA classification & accruals
│   └── scheme/          # Loan product schemes & interest rules
├── modules/             # Enterprise System Modules
│   ├── auth/            # Auth, login, tokens, password management
│   ├── org/             # Organization branches & company profile
│   └── employee/        # Employee management & access roles
├── plugins/             # Fastify plugins (masterDb, tenantDb, auth, tenantGuard, moduleGuard)
└── app.js               # Main application entry point & route registration
```

## Module Structure Pattern
Inside `server/src/finance/<feature>/` or `server/src/gold/<feature>/`:
- `<feature>.routes.js`: Route definitions & plugin registration.
- `<feature>.controller.js`: Request parsing, HTTP response formatting.
- `<feature>.service.js`: Database queries via `req.tenantDb` or `fastify.masterDb`, business rules.
- `<feature>.schema.js`: Fastify JSON Schema for validation.

## Coding Conventions
1. **Route Declaration**:
   ```javascript
   // Finance Engine Route
   fastify.post('/api/finance/loans', {
     preHandler: [fastify.authenticate, fastify.tenantGuard],
     schema: createLoanSchema
   }, controller.createLoan);

   // Gold Engine Route
   fastify.post('/api/gold/appraisals', {
     preHandler: [fastify.authenticate, fastify.tenantGuard],
     schema: createAppraisalSchema
   }, controller.createAppraisal);
   ```
2. **Error Handling**:
   - Standardize responses: `{ success: true, data: result }` or `{ success: false, message: "Error" }`.
   - Use `@fastify/sensible` HTTP error handlers.
