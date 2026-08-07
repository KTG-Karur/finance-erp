# Financial ERP Agent Rules

## System Architecture & Domain Separation
- **Architecture**: Multi-Tenant Financial ERP (Monorepo with `client/` and `server/`).
- **Server Module Structure**:
  - `server/src/finance/`: Core Finance Engine (Loans, EMI Amortization, General Ledger, NPA, Borrowers, Collections).
  - `server/src/core/`: Common plugins, auth middleware, dynamic tenant DB pool factory (`tenantDb`), master DB context.
- **Backend**: Fastify (v4), MySQL (`mysql2/promise`), Database-per-Tenant model.
- **Frontend**: React (Vite SPA), SCSS (BEM methodology), Lucide Icons, Recharts, jsPDF.

## Code Standards & Token Efficiency
1. **Token Economy**:
   - Write concise, dense code without conversational fluff or redundant inline comments.
   - Omit trivial docstrings; explain only non-obvious business logic.
2. **Database Isolation & Safety**:
   - Always query tenant data via `req.tenantDb`; master data via `fastify.masterDb`. Never mix contexts.
   - Use parameterized queries (`?`) for all SQL statements.
   - Use MySQL transactions (`connection.beginTransaction()`, `commit()`, `rollback()`) for all multi-table financial writes.
3. **Financial Precision**:
   - Use `DECIMAL(15,2)` / `DECIMAL(18,4)` in SQL. Avoid JS float rounding errors using integer cents or explicit rounding.
   - Enforce double-entry accounting constraints (`SUM(debit) === SUM(credit)`).
4. **Backend API (Fastify)**:
   - Routes mounted under `/api/finance/*`.
   - Define Fastify route schemas (`body`, `params`, `querystring`).
   - Standardize API success responses: `{ success: true, data: ... }` and error responses: `{ success: false, message: ... }`.
5. **Frontend UI (React + SCSS)**:
   - Follow SCSS design tokens in `client/src/styles/_variables.scss` and BEM methodology.
   - High-density light enterprise layout (`#F8FAFC` workspace background, `tabular-nums` for numbers).
