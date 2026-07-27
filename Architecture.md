# ARCHITECTURE SPECIFICATION: Multi-Tenant Financial ERP

## Executive Summary & System Goals
This document specifies the technical architecture for an enterprise-grade **Multi-Tenant Financial ERP** system built on Node.js/Fastify, React (Vite SPA), SCSS (BEM), and MySQL. The platform uses a **Database-per-Tenant** isolation model to meet financial data privacy, compliance, and custom audit requirements.

---

## 1. TECH STACK & DESIGN TOKENS
* **Architecture:** Monorepo with single React frontend and single Fastify backend.
* **Frontend:** React (Vite SPA), SCSS (Sass, BEM methodology), Lucide Icons, Radix UI primitives.
* **Styling Strategy:** SCSS design tokens in `client/src/styles/_variables.scss`. High-density, sober light-enterprise layout (`#F8FAFC` workspace, `#FFFFFF` cards, `#D1D5DB` borders, `tabular-nums` tabular formatting).
* **Backend:** Fastify (Node.js) with async dynamic MySQL (`mysql2/promise`) connection pooling per tenant.
* **Multi-Tenancy Model:** Database-per-Tenant (Isolated DB per company + Central Master DB for auth & provisioning).
* **Authentication:** Dual Flow via JWT:
  1. **Tenant Login (`/login`):** `company_code` + `email` + `password` -> isolated Tenant DB context.
  2. **Super Admin Login (`/superadmin/login`):** `email` + `password` -> Central Master DB context.

---

## 2. SYSTEM TOPOLOGY & CONNECTION POOLING ARCHITECTURE

```
+-------------------------------------------------------------------------------+
|                               REACT FRONTEND (Vite)                           |
+-------------------------------------------------------------------------------+
                                      |
                            HTTP / REST + JWT Header
                                      v
+-------------------------------------------------------------------------------+
|                           FASTIFY BACKEND API GATEWAY                         |
|  +---------------------+   +---------------------+   +---------------------+  |
|  | masterDb Plugin     |   | Dynamic Pool Factory|   | Auth & Guards Plugin|  |
|  | (Central DB Pool)   |   | (Tenant Connection) |   | (RBAC & Impersonate)|  |
|  +---------------------+   +---------------------+   +---------------------+  |
+-------------------------------------------------------------------------------+
               |                                     |
               v                                     v
+-----------------------------+       +-----------------------------+
|    CENTRAL MASTER DB        |       |     ISOLATED TENANT DBS     |
|   `master_erp_db`           |       |  `tenant_alpha_db`          |
|  - companies                |       |  `tenant_beta_db`           |
|  - master_users             |       |  - loans & schedules        |
|  - tenant_subscriptions     |       |  - general_ledger & journal |
|  - superadmin_audit_logs    |       |  - employees & RBAC         |
+-----------------------------+       +-----------------------------+
```

### Dynamic Connection Pool Management (`tenantDb.js`)
To prevent connection exhaustion across thousands of tenant databases, the Fastify dynamic pool factory manages connections using an LRU/TTL cache strategy:
- **Pool Caching:** Pools are indexed by `db_name` in an internal Map cache.
- **Connection Idle Eviction:** Idle tenant pools auto-close after 15 minutes of inactivity (`idleTimeoutMs: 900000`).
- **Connection Caps:** Max 10 active connections per tenant pool, max 100 connections on the Master Pool.

---

## 3. DATABASE SCHEMAS (DDL SPECIFICATIONS)

### A. Central Master Database (`master_erp_db`)

```sql
CREATE TABLE companies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    company_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'ALPHA', 'BETA'
    db_name VARCHAR(100) UNIQUE NOT NULL,      -- e.g., 'tenant_alpha_db'
    db_host VARCHAR(255) DEFAULT 'localhost',
    db_port INT DEFAULT 3306,
    db_user VARCHAR(100) NOT NULL,
    db_password_enc VARCHAR(500) NOT NULL,
    plan_tier ENUM('STARTER', 'STANDARD', 'ENTERPRISE') DEFAULT 'STANDARD',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_company_code (company_code)
);

CREATE TABLE master_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('SUPER_ADMIN', 'SYSTEM_AUDITOR') DEFAULT 'SUPER_ADMIN',
    is_global_admin TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE superadmin_audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    superadmin_id INT NOT NULL,
    target_tenant_id INT,
    action VARCHAR(100) NOT NULL,
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (superadmin_id) REFERENCES master_users(id)
);
```

### B. Tenant Database Template (`tenant_x_db`)

```sql
-- RBAC & Organization Structure
CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'LOAN_OFFICER', 'CREDIT_MANAGER', 'FINANCE_ADMIN'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module VARCHAR(50) NOT NULL, -- e.g. 'LOANS', 'NPA', 'FINANCE', 'EMPLOYEES'
    action VARCHAR(50) NOT NULL, -- e.g. 'READ', 'WRITE', 'APPROVE', 'EXPORT'
    code VARCHAR(100) UNIQUE NOT NULL -- e.g. 'LOANS:APPROVE'
);

CREATE TABLE role_permissions (
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE employee_roles (
    employee_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (employee_id, role_id),
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- Core Financial & Loan Operations
CREATE TABLE borrowers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    borrower_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    national_id VARCHAR(100),
    credit_score INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_account_no VARCHAR(100) UNIQUE NOT NULL,
    borrower_id INT NOT NULL,
    principal_amount DECIMAL(15,2) NOT NULL,
    annual_interest_rate DECIMAL(5,2) NOT NULL,
    tenure_months INT NOT NULL,
    disbursement_date DATE NOT NULL,
    status ENUM('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'CLOSED', 'DEFAULTED') DEFAULT 'DRAFT',
    days_past_due INT DEFAULT 0,
    asset_classification ENUM('STANDARD', 'SMA_0', 'SMA_1', 'SMA_2', 'NPA_SUBSTANDARD', 'NPA_DOUBTFUL', 'NPA_LOSS') DEFAULT 'STANDARD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (borrower_id) REFERENCES borrowers(id)
);

CREATE TABLE repayment_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id INT NOT NULL,
    installment_no INT NOT NULL,
    due_date DATE NOT NULL,
    principal_due DECIMAL(15,2) NOT NULL,
    interest_due DECIMAL(15,2) NOT NULL,
    total_installment DECIMAL(15,2) NOT NULL,
    principal_paid DECIMAL(15,2) DEFAULT 0.00,
    interest_paid DECIMAL(15,2) DEFAULT 0.00,
    status ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE') DEFAULT 'PENDING',
    FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
);

-- General Ledger & Double-Entry Accounting
CREATE TABLE chart_of_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_code VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(150) NOT NULL,
    account_type ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE') NOT NULL,
    parent_id INT NULL,
    is_active TINYINT(1) DEFAULT 1,
    FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id)
);

CREATE TABLE journal_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_number VARCHAR(100) UNIQUE NOT NULL,
    entry_date DATE NOT NULL,
    description TEXT,
    reference_type VARCHAR(50), -- e.g. 'LOAN_DISBURSEMENT', 'LOAN_REPAYMENT', 'NPA_PROVISION'
    reference_id INT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE journal_lines (
    id INT AUTO_INCREMENT PRIMARY KEY,
    journal_entry_id INT NOT NULL,
    account_id INT NOT NULL,
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id)
);
```

---

## 4. DOMAIN ENGINE SPECIFICATIONS

### A. Loan Amortization Engine (Reducing Balance Method)
Calculates Equal Monthly Installments (EMI) using standard financial formulas:
$$EMI = P \times r \times \frac{(1 + r)^n}{(1 + r)^n - 1}$$
Where:
- $P$ = Principal amount
- $r$ = Monthly interest rate ($\text{Annual Rate} / 12 / 100$)
- $n$ = Tenure in months

**Repayment Waterfall Logic:**
When a loan repayment is processed, funds are allocated in strict priority:
1. Outstanding Penalties / Late Fees
2. Outstanding Accrued Interest
3. Principal Amount

### B. Asset Quality & NPA Regulatory Provisioning Engine (RBI Norms)
Calculates asset classification and provisioning requirements based on Days Past Due (DPD):

| Days Past Due (DPD) | Asset Classification | Category | Minimum Provision Rate (%) |
| :--- | :--- | :--- | :--- |
| **0 DPD** | `STANDARD` | Standard Performing | 0.40% |
| **1 - 30 DPD** | `SMA_0` | Special Mention Account 0 | 0.40% |
| **31 - 60 DPD** | `SMA_1` | Special Mention Account 1 | 0.40% |
| **61 - 90 DPD** | `SMA_2` | Special Mention Account 2 | 0.40% |
| **91 - 180 DPD** | `NPA_SUBSTANDARD` | Non-Performing Asset (Substandard) | 15.00% |
| **181+ DPD** | `NPA_DOUBTFUL` | Non-Performing Asset (Doubtful) | 25.00% |

### C. Double-Entry Accounting Engine Integration
Every financial transaction triggers auto-balanced debit and credit entries in the General Ledger:
1. **Loan Disbursement:**
   - Debit: Loan Portfolio Account (Asset)
   - Credit: Bank Account / Cash (Asset)
2. **Repayment Received:**
   - Debit: Bank Account / Cash (Asset)
   - Credit: Interest Income Account (Revenue)
   - Credit: Loan Portfolio Account (Asset Principal reduction)
3. **NPA Provisioning:**
   - Debit: Bad Debt Provision Expense (Expense)
   - Credit: Allowance for Non-Performing Loans (Contingent Liability)

---

## 5. SECURITY, AUTHORIZATION & RBAC MATRIX

### Permission Guard Architecture (`moduleGuard.js`)
All API endpoints for tenant features pass through Fastify pre-handler permission verification:
- Extracts employee JWT token claims.
- Evaluates token roles against target endpoint permission (e.g. `LOANS:APPROVE`, `FINANCE:POST_JOURNAL`).
- Rejects unauthorized calls with standard 403 Forbidden payload.

### Super Admin Impersonation & Audit Controls (`tenantGuard.js`)
- Super Admins can access tenant endpoints with a target `X-Tenant-Code` header.
- Every impersonated transaction logs an entry in `master_erp_db.superadmin_audit_logs` including IP address, admin user ID, action name, and modified resources.

---

## 6. VERIFICATION & QUALITY STANDARDS
- **Data Integrity:** All dynamic tenant connection pools run with strict transaction isolation levels (`READ COMMITTED`).
- **Performance:** All cross-table database queries use composite indexes on key identifiers (`borrower_id`, `loan_id`, `due_date`, `company_code`).
- **UI Consistency:** Component styling enforces CSS variables for theme colors (`var(--color-bg)`, `var(--color-border)`, `var(--color-primary)`).