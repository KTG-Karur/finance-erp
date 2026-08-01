# FINANCIAL ERP SaaS - MASTER ARCHITECTURE & OPERATIONAL SPECIFICATION

## Executive Overview

FINCORP ERP is a multi-tenant, Database-per-Tenant SaaS designed for financial institutions, NBFCs, and private finance firms.

* **Database-per-Tenant:** Every tenant (company) operates on its own completely isolated database.
* **Hierarchical Structure:** Tenant $\rightarrow$ Sub-Companies $\rightarrow$ Branches $\rightarrow$ Employees.
* **Context-Aware Scoping:** Enforces strict Role-Based Access Control (RBAC) across `company_id`, `sub_company_id`, and `branch_id`.

---

## 1. System Architecture

```mermaid
graph TD
    Client[Client Application / UI] --> Gateway[API Gateway / Router]

    subgraph Master Scope
        Gateway --> MasterService[Master Service]
        MasterService --> Redis[(Redis Cache - Tenant Mapping)]
        MasterService --> MasterDB[(Master Database)]
    end

    subgraph Tenant Engine Scope
        Gateway --> TenantEngine[Tenant Engine]
        TenantEngine --> DynamicConn[Dynamic DB Connection]
        DynamicConn --> TenantDB[(Tenant Database: tenant_smf001)]
    end

    subgraph Tenant Database Schemas
        TenantDB --> MasterMenu[System Masters & Controls]
        TenantDB --> Users[Users, Roles & Permissions]
        TenantDB --> Hierarchy[Sub-Companies & Branches]
        TenantDB --> FinanceData[Loans, Investors, FD & Expenses]
        TenantDB --> Audit[Audit Trail Logs]
    end

```

---

## 2. Platform Hierarchy & Super Admin Control

### Super Admin Responsibilities

* Provision Tenant & Generate Unique `Company Code` (e.g., `SMF001`).
* Create & Initialize Isolated Tenant Database (`tenant_smf001`).
* Enable Subscribed Modules (`✓ Finance`, `✗ Gold Loan`, `✗ Chit`, `✗ MFI`).
* Enforce Subscription Caps (e.g., Max Sub-Companies = 3).
* Activate, Suspend, or Upgrade Tenant Subscriptions.

### Tenant Hierarchy Example

```text
Sri Murugan Finance (SMF001)
├── Sub-Company A1
│     ├── Karur Main Branch
│     ├── Karur North Branch
│     └── Salem Branch
├── Sub-Company A2
│     ├── Chennai Branch
│     └── Madurai Branch
└── Sub-Company A3
      ├── Coimbatore Branch
      └── Trichy Branch

```

---

## 3. Multi-Tenant Authentication & Secure Branch Selection

To prevent public enumeration of internal company branch structures, **branch selection occurs strictly AFTER credential verification**.

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Client App (UI)
    participant Gateway as API Gateway
    participant Cache as Redis / Master DB
    participant TenantDB as Tenant Database

    User->>UI: Enter Company Code (SMF001), Username, Password
    UI->>Gateway: POST /api/v1/auth/login
    Gateway->>Cache: Resolve Company Code Mapping
    Cache-->>Gateway: Return Connection Info (tenant_smf001)
    Gateway->>TenantDB: Authenticate Username & Password Hash
    TenantDB-->>Gateway: Return User Profile & Assigned Branches
    
    alt Multi-Branch User (Branch Manager / Auditor)
        Gateway-->>UI: Prompt "Select Working Branch" UI Modal
        User->>UI: Select Working Branch (e.g., Karur Main)
        UI->>Gateway: POST /api/v1/auth/select-branch
    else Single Branch / Tenant Admin
        Gateway-->>UI: Auto-select Branch or Apply Global Scope
    end

    Gateway-->>UI: Issue JWT Token (tenant_id + sub_company_id + branch_id)
    UI->>User: Load ERP Dashboard with Permitted Modules

```

---

## 4. System Master Menu (Central Configurations)

The **Master Menu** is the administrative control center inside each tenant database. It defines rules, schemes, categories, and master parameters that govern how all operational modules behave.

```mermaid
graph TD
    MasterMenu[SYSTEM MASTER MENU] --> OrgMaster[1. Organization Masters]
    MasterMenu --> SchemeMaster[2. Scheme & Interest Masters]
    MasterMenu --> AccountingMaster[3. Accounting & Expense Masters]
    MasterMenu --> SecurityMaster[4. User & Access Masters]

    OrgMaster --> SubCompBranch[Sub-Companies & Branches Setup]
    OrgMaster --> PartyMaster[Customers, Investors & Guarantors]

    SchemeMaster --> LoanSchemes[Loan Schemes & Unit Base Rules]
    SchemeMaster --> FDSchemes[FD Schemes & Doubling Rules]

    AccountingMaster --> ChartOfAccounts[Chart of Accounts]
    AccountingMaster --> ExpenseCategories[Expense Categories & Vouchers]

    SecurityMaster --> RolesPerms[Roles & Permission Matrix]

```

### Key Master Settings Managed:

1. **Scheme Master:** Define Unit Base Defaults (Per ₹100 or Per ₹1,000), default rate brackets, overdue penalty rules, and slab ranges.
2. **Expense Category Master:** Manage approved expense categories (e.g., Office Rent, Salaries, Stationery, Electricity, Agent Commissions, Fuel).
3. **Chart of Accounts Master:** Define root debit and credit ledger heads.
4. **User & Permission Master:** Assign dynamic role permissions (e.g., who can approve loans, who can create expense vouchers, who can void receipts).

---

## 5. Finance Module Workflows

When branch staff enter the Finance Dashboard, five real-time indicators are presented:

1. **Total Disbursed Loans:** Total principal currently active with borrowers.
2. **Total Investor Capital:** Total private capital backing branch operations.
3. **Total FD Liabilities:** Locked customer term deposits and upcoming maturities.
4. **Total Branch Expenses:** Total operating expenses incurred for the active period.
5. **Available Vault Balance:** Net cash available in the branch drawer/bank.

```mermaid
graph TD
    Dashboard[Finance Dashboard] --> CustomerModule[5.1 Customer Loans STL]
    Dashboard --> InvestorModule[5.2 Investor Capital]
    Dashboard --> FDModule[5.3 Fixed Deposits FD]
    Dashboard --> ExpenseModule[5.4 Branch Expenses]

    CustomerModule --> Ledger[Double-Entry General Ledger]
    InvestorModule --> Ledger
    FDModule --> Ledger
    ExpenseModule --> Ledger

    Ledger --> Reports[Financial & Audit Reports Engine]

```

---

### 5.1 Customer Loan Operations (Lending Flow)

Handles Short-Term Loans (STL), daily/weekly/monthly collections, and modular interest calculations.

```mermaid
flowchart LR
    A[Customer Onboarding] --> B[Scheme Configuration]
    B --> C[Loan Disbursal]
    C --> D[Collection / Pay Entry]
    D --> E[Principal Recalculation]
    E --> F[Loan Closure]

```

#### Scheme & Interest Engine Rules:

1. **Unit-Based Engine (Per ₹100 / Per ₹1,000 Base):**

$$\text{Base Units} = \frac{\text{Total Loan Amount}}{\text{Unit Base (₹100 or ₹1,000)}}$$


$$\text{Monthly Interest} = \text{Base Units} \times \text{Rate per Unit}$$


2. **Interest Calculation Modes:**
* **Static Rate:** Fixed rate per unit or fixed percentage for the full tenure.
* **Day-Slab Brackets (Tiered Escalation):**
* Days 1 – 90: Rate $A$
* Days 91 – 180: Rate $B$
* Days 181 – 270: Rate $C$
* Days 271+: Rate $D$ (Penalty Rate)




3. **Repayment Modes:**
* **Mode 1 (Interest-Only):** Customer pays accrued interest periodically; principal paid in full at account closure.
* **Mode 2 (Flexible Int + Principal):** Customer pays interest + flexible principal amount. Principal is reduced immediately, and future interest is recalculated **only on the remaining principal balance**.
* **Mode 3 (Fixed Due / EMI):** Combined installment covering Interest portion + Principal reduction.



---

### 5.2 Investor Capital Operations (Private Funding Flow)

Manages external capital injected into the company to fund lending operations.

```mermaid
flowchart TD
    A[Investor Onboarding] --> B[Capital Injection Entry]
    B --> C[Periodic Yield Accrual Engine]
    C --> D{Investor Pay Entry}
    D -->|Yield Payout| E[Pay Interest - Principal Unchanged]
    D -->|Capital Top-Up| F[Add Funds - Recalculate Yield Up]
    D -->|Withdrawal| G[Settle Interest First - Reduce Principal]

```

#### Key Rules:

* **Capital Flexibility:** Investors can freely add capital top-ups or request partial principal withdrawals mid-term.
* **Return Schemes:** Static Yield %, Tenure Slabs (1–6 months, 7–12 months, etc.), or Profit Sharing % from branch interest income.
* **Payout Types:** Monthly Yield Payout OR Cumulative Compounded Reinvestment.

---

### 5.3 Fixed Deposit (FD) Operations (Savings Product Flow)

Manages term deposits offered to customers with formal certificate generation and locked tenures.

```mermaid
flowchart TD
    A[FD Booking & Receipt] --> B[Generate Printable FD Certificate]
    B --> C[Interest Accrual Engine]
    C --> D{Maturity Resolution}
    D -->|Full Term Met| E[Pay Principal + Total Interest]
    D -->|Premature Exit| F[Apply Penalty Rate - Pay Net Reduced Yield]

```

---

### 5.4 Expenses Module (Operational Expenditure Flow)

Manages all day-to-day branch expenditures, petty cash, vendor payments, and administrative overheads.

```mermaid
flowchart TD
    A[Select Expense Category] --> B[Input Expense Voucher Details]
    B --> C{Requires Approval?}
    C -->|Yes - Above Limit| D[Branch Manager / Admin Approval]
    C -->|No - Within Limit| E[Post Direct Cash Payment]
    D --> E
    E --> F[Journal Ledger Entry & Vault Balance Deduction]

```

#### Key Features:

* **Expense Categories:** Defined in the **Master Menu** (e.g., Rent, Utilities, Staff Salary, Agent Commission, Legal Fees, Printing/Stationery, Travel/Fuel).
* **Payment Modes:** Cash (Deducts from active Vault Drawer), Bank Transfer, UPI, Cheque.
* **Approval Limits:** Tenant Admin can set approval thresholds in Master Controls (e.g., Expenses $> \text{₹5,000}$ require Branch Manager or Tenant Admin sign-off).
* **Ledger Posting:** Automatically posts a balanced entry:
* `DEBIT : Operating Expense Account (e.g., Rent)`
* `CREDIT: Vault Cash / Bank Account`



---

## 6. Double-Entry Accounting Engine

Every transaction automatically generates balanced Debit and Credit entries in an immutable **General Ledger**.

```mermaid
graph LR
    subgraph Operational Actions
        Op1[Loan Disbursal]
        Op2[Loan Collection]
        Op3[Investor Payout]
        Op4[FD Booking]
        Op5[Expense Voucher]
    end

    subgraph Journal Posting Engine
        Op1 -->|Debit Loan Rec / Credit Cash| GL[(General Ledger)]
        Op2 -->|Debit Cash / Credit Loan Rec & Int Income| GL
        Op3 -->|Debit Int Expense / Credit Cash| GL
        Op4 -->|Debit Cash / Credit FD Liability| GL
        Op5 -->|Debit Expense Account / Credit Cash| GL
    end

    subgraph Financial Output
        GL --> Daybook[Daybook / Cashbook]
        GL --> LedgerStmt[Party Ledger Statements]
        GL --> MarginReport[Net Profit & Loss Statement]
    end

```

### Core Financial Formula:

$$\text{Net Profit} = \text{Interest Income (Loans)} - \left( \text{Investor Yield} + \text{FD Interest Expense} + \text{Operating Expenses} \right)$$

---

## 7. Audit Logging & System Traceability Engine

Every data modification is logged to prevent fraud and maintain regulatory audit trails. Audit records are **immutable** and cannot be altered or deleted.

```mermaid
flowchart TD
    UserAction[User Performs Action: e.g., Add Expense / Collect Cash / Void Receipt] --> Interceptor[Middleware / DB Trigger Interceptor]
    Interceptor --> Execution[Execute Transaction in Tenant DB]
    Interceptor --> AuditBuilder[Construct Audit Payload]
    
    AuditBuilder --> Payload[JSON Payload:
    - user_id, branch_id
    - action: CREATE / UPDATE / VOID
    - entity: expense_vouchers / loan_accounts
    - old_values: JSON
    - new_values: JSON
    - ip_address, timestamp]
    
    Payload --> AuditTable[(audit_logs Table - Append Only)]

```

---

## 8. Reports Engine

```mermaid
graph TD
    ReportsEngine[FINANCE REPORTS ENGINE] --> OpsReports[1. Operational Reports]
    ReportsEngine --> FinReports[2. Financial & Accounting Reports]
    ReportsEngine --> AuditReports[3. Audit & Compliance Reports]

    OpsReports --> Daybook[Daily Cashbook / Daybook]
    OpsReports --> DueList[Daily / Weekly Due Collection List]
    OpsReports --> OverdueSlab[Aging & Overdue Slab Report]
    OpsReports --> ExpenseSummary[Category-Wise Expense Summary]

    FinReports --> GeneralLedger[Party General Ledger]
    FinReports --> PnL[Net Interest Margin & P&L Statement]
    FinReports --> BalanceSheet[Trial Balance & Balance Sheet]

    AuditReports --> AuditTrail[System Audit Trail Log]
    AuditReports --> VoidReport[Voided Receipts & Reversals]
    AuditReports --> AccessLog[User Activity & Login Log]

```

---

## 9. Operational Summary Matrix

| Module | Purpose | Capital Flexibility / Rules | Primary Output |
| --- | --- | --- | --- |
| **System Master** | Central parameters & configuration | Controls schemes, categories & RBAC | System Rules & Dropdown Configs |
| **Customer Loans** | Disbursing funds to borrowers | Flexible principal reduction | Loan Schedule & Collection Receipts |
| **Investor Capital** | Sourcing private business funding | Flexible top-ups & withdrawals | Investor Statement & Yield Vouchers |
| **Fixed Deposits** | Customer term savings scheme | Locked principal during tenure | Printable FD Certificate & Maturity Voucher |
| **Expenses** | Operating overhead management | Category tracking & approval limits | Expense Vouchers & Profit Reduction |

```

```