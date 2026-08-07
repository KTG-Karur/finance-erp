---
name: react-frontend
description: Building Vite React UI modules, SCSS BEM styling, high-density ERP data tables, Lucide Icons, Recharts dashboard visualizations, and PDF export utils.
---

# React Frontend Skill

## Frontend Architecture
- **Location**: `client/src/`
- **Structure**:
  - `modules/`: Domain UI modules (`loan`, `finance`, `borrowers`, `reports`, `settings`, `npa`).
  - `components/`: Shared reusable primitives (Tables, Modals, Inputs, Buttons, Badges).
  - `layouts/`: Main app frame, sidebar navigation, top bar, header context.
  - `styles/`: Global SCSS design tokens, BEM component styles (`_variables.scss`).
  - `api/`: Axios HTTP client instances and API endpoint wrappers.

## Design & UI Guidelines
1. **Design System & Aesthetics**:
   - High-density sober enterprise look. Light background (`#F8FAFC`), crisp borders (`#D1D5DB`).
   - Use BEM naming for SCSS (`.loan-card`, `.loan-card__header`, `.loan-card__title--active`).
   - Use `tabular-nums` class on numeric / monetary table columns for visual alignment.
2. **Data Presentation**:
   - Support currency formatting (`₹` / `USD`), status pills for loan states (`Active`, `Closed`, `NPA`, `Overdue`).
   - Integrations: Recharts for financial dashboard metrics, `jsPDF` + `jspdf-autotable` for receipt/statement downloads.
3. **State & Async Operations**:
   - Manage loading and error states explicitly on forms and data grids.
   - Use central API service helper in `client/src/api/` with Axios interceptors for JWT injection.
