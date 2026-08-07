---
name: financial-core
description: Implementation of loan lifecycle calculations, interest schedules (flat/reducing/daily), NPA classification, and General Ledger double-entry transactions.
---

# Financial Core Skill

## Business Logic Specifications

### 1. Loan & EMI Calculation
- **Interest Schemes**:
  - **Flat Rate**: `Interest = Principal * Rate * Tenure`.
  - **Reducing Balance**: EMI calculated using `P * r * (1+r)^n / ((1+r)^n - 1)`.
  - **Daily/Monthly Interest (Gold Loans)**: Accrued daily/monthly on outstanding principal.
- **Rounding**: All installment breakdown values must round to 2 decimal places with remainder adjustment on final installment.

### 2. Double-Entry General Ledger
- Every financial movement must balance: `SUM(Debit) == SUM(Credit)`.
- **Journal Entry Pattern**:
  - Loan Disbursement: Debit `Loan Receivables`, Credit `Cash/Bank`.
  - Repayment Receipt: Debit `Cash/Bank`, Credit `Loan Receivables` (Principal), Credit `Interest Income`.
- Enforce transactional consistency when posting journal entries alongside loan schedule updates.

### 3. Non-Performing Asset (NPA) Tracking
- Categorize loans based on Overdue Days (`DPD - Days Past Due`):
  - **Standard**: 0 - 89 days overdue.
  - **Sub-Standard**: 90 - 179 days overdue.
  - **Doubtful**: 180 - 359 days overdue.
  - **Loss Asset**: 360+ days overdue.
- Automatic NPA status recalculation during batch accrual runs.
