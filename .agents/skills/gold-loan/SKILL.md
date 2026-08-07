---
name: gold-loan
description: Development and business logic execution for Gold Loan engine, jewel appraisal, metal rate masters, vault custody, and bank re-pledging workflows under src/gold.
---

# Gold Loan Skill

## Core Domain Features (`server/src/gold/` & `client/src/modules/gold/`)

### 1. Jewel Appraisal & LTV Engine
- **Item Categorization**: Category (Bangles, Chain, Ring, etc.), Gross Weight (g), Stone Weight (g), Net Weight (g), Karat Purity (18K, 20K, 22K, 24K).
- **LTV (Loan-To-Value) Calculation**:
  `Max Loan Amount = Net Weight * (Purity / 24) * Daily Metal Rate * LTV %`.

### 2. Metal Rate Master
- Custom daily gold rate per gram indexed by Karat/Purity (`22K`, `24K`).
- Enforces effective date limits for loan appraisals.

### 3. Hub & Vault Custody Management
- **Packet Generation**: Barcode/Barcode packet ID assignment per appraisal.
- **Vault Movements**: Branch Vault $\leftrightarrow$ Hub Vault transfer register with custody logs.

### 4. Gold Re-Pledging Workflow
- Record re-pledged gold with commercial banks (Bank name, Pledged Date, Bank Interest %, Loan amount).
- Track bank-to-branch movement and release workflows.
