# Financial ERP Agent Rules

## System Architecture & Domain Separation
- **Architecture**: Multi-Tenant Financial ERP (Monorepo with `client/` Vite SPA and `server/` Fastify v4 API).
- **Server Module Structure**:
  - `server/src/finance/`: Core Finance Engine (`loan/`, `ledger/`, `borrower/`, `collection/`, `npa/`, `scheme/`).
  - `server/src/modules/`: System modules (`auth/`, `org/`, `employee/`).
  - `server/src/core/` & `server/src/plugins/`: Plugins (`masterDb`, `tenantDb`, `auth`, `tenantGuard`, `moduleGuard`).
- **Backend**: Fastify (v4), MySQL (`mysql2/promise`), Database-per-Tenant model with dynamic connection pool caching.
- **Frontend**: React (Vite SPA), SCSS (BEM methodology), Lucide Icons, Recharts, jsPDF.

## Code Standards & Token Efficiency
1. **Token Economy**:
   - Write concise, dense code without conversational fluff or redundant inline comments.
   - Omit trivial docstrings; explain only non-obvious business logic.
2. **Database Isolation & Safety**:
   - Always query tenant data via `req.tenantDb` or `connection` acquired from `req.tenantDb`; query central/master data via `fastify.masterDb`. Never mix contexts.
   - Use parameterized queries (`?`) for all SQL statements.
   - Use MySQL transactions (`connection.beginTransaction()`, `commit()`, `rollback()`) for all multi-table financial writes and release connections (`connection.release()`) in `finally` blocks.
3. **Financial Precision**:
   - Use `DECIMAL(15,2)` / `DECIMAL(18,4)` in SQL. Avoid JS float rounding errors using integer cents or explicit rounding.
   - Enforce double-entry accounting constraints (`SUM(debit) === SUM(credit)`).
4. **Backend API (Fastify)**:
   - Canonical API routes mounted under `/api/v1/*` (e.g. `/api/v1/auth`, `/api/v1/finance`, `/api/v1/employees`).
   - Define Fastify route schemas (`body`, `params`, `querystring`).
   - Standardize API success responses: `{ success: true, data: ... }` and error responses: `{ success: false, message: ... }`.
5. **Frontend UI (React + SCSS)**:
   - Follow SCSS design tokens in `client/src/styles/_variables.scss` and BEM methodology.
   - High-density light enterprise layout (`#F8FAFC` workspace background, `tabular-nums` for numbers).
6. **Canonical Shared Form Components (Strict Rule)**:
   - **Zero Native `<select>` or `<input type="date">`**: Never use native browser `<select>` or `<input type="date">` in any module, page, modal, drawer, or filter toolbar.
   - **Dropdowns**: Always use `SharedDropdown` (`client/src/components/common/SharedDropdown.jsx`).
   - **Calendars / Dates**: Always use `SharedDatePicker` (`client/src/components/common/SharedDatePicker.jsx`).
   - When creating or modifying forms/filters, always maintain these shared components across all views for system-wide UI consistency.
7. **No Build Commands**:
   - Never run `npm run build` or Vite production build commands during development/validation. Both the client and server run live dev servers with Hot Module Replacement (HMR).
8. **Incremental Migration Policy (Strict Rule)**:
   - Every database schema change (new tables, new columns, altered column types, new indexes) MUST ALWAYS be created as a new, separate incremental migration file (e.g. `server/src/tenant-configuration/migrations/YYYYMMDDNNNNNN-<description>.js` for tenant databases, or `server/src/database/migrations/YYYYMMDDNNNNNN-<description>.js` for master database).
   - Never edit, overwrite, or mutate previously applied migration files.
   - Always provide both `up(queryInterface, Sequelize)` and `down(queryInterface, Sequelize)` methods with error resilience.
9. **Temporary & Ad-hoc Scripts Location (Strict Rule)**:
   - All temporary, ad-hoc, diagnostic, data-cleaning, inspection, or check/alter local scripts MUST ALWAYS be placed under the `server/temp/` (or `temp/`) folder (create the directory if it does not exist).
   - Never write one-off or temporary diagnostic/cleanup scripts into `server/scripts/` or project source folders.
   - Keep `server/scripts/` strictly reserved for permanent system scripts (such as `migrate.js`).
10. **Synchronized RBAC Roles & Permissions (Strict Rule)**:
   - Whenever any new feature, approval queue, action button, or capability (such as Waiver Approvals, Foreclosure Approvals, Top-up Approvals, Reversals, or Exporting) is introduced:
     - **Backend Route Guard**: Protect the corresponding Fastify API endpoints with `fastify.moduleGuard('<MODULE>', '<ACTION>')` or `fastify.moduleGuardAny([...])`.
     - **Permission Matrix Hierarchy**: Register the new action and capability in `RBAC_MENU_SECTIONS` within `client/src/components/PermissionMatrix.jsx` (with descriptive label, description, and Lucide icon) so tenant administrators can configure granular permissions per role or staff member.
     - **Frontend Permission Check**: Check the user's role or granted permissions (`user.permissions`) before displaying or enabling the action button in UI views, modals, or drawers.
11. **Responsive Multi-Screen Optimization (Strict Rule)**:
   - Every view, page, tab, data table, toolbar, form, drawer, and modal MUST ALWAYS be fully optimized and verified for all screen sizes:
     - **Large Desktop (>= 1200px)**: High-density enterprise layout, spacious side-by-side grids, and immediate data readability.
     - **Laptops / Medium Screens (768px - 1199px)**: Fluid layouts with no awkward horizontal page overflow, combined/compact data columns where needed, and immediately visible primary action buttons.
     - **Mobile / Narrow Screens (< 768px)**: Flex-wrap toolbars, full-width inputs/search bars, touch-friendly tap targets (min 36-40px), horizontal scroll containers with sticky headers/pinned action columns for data tables, and modals scaled to `max-width: 95vw` with auto-scrolling bodies.
   - Never hardcode rigid pixel widths on parent containers without responsive max-widths, and never let primary action buttons (such as Approve, Reject, Collect, Print, Save) get pushed invisibly off-screen.



