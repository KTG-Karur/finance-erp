import { CHART_OF_ACCOUNTS, calculateIncomeStatement } from './accounting.service.js';

export default async function financeRoutes(fastify, options) {
  // GET Cash Book Entries
  fastify.get('/cash-book', async (request, reply) => {
    return {
      status: 'OK',
      vault_balance: 45800,
      data: [
        { id: 1, date: '2026-07-24', description: 'Opening Cash Balance in Branch Vault', type: 'INFLOW', amount: 35000, category: 'VAULT_OPENING' },
        { id: 2, date: '2026-07-24', description: 'Daily Field Collection (Rajesh Kumar - LN-001)', type: 'INFLOW', amount: 500, category: 'COLLECTION' },
        { id: 3, date: '2026-07-24', description: 'Office Fuel & Conveyance Allowance', type: 'OUTFLOW', amount: 450, category: 'EXPENSE' },
        { id: 4, date: '2026-07-24', description: 'Daily Field Collection (Priya Sharma - LN-002)', type: 'INFLOW', amount: 1000, category: 'COLLECTION' }
      ]
    };
  });

  // GET General Ledger Chart of Accounts
  fastify.get('/general-ledger', async (request, reply) => {
    return {
      status: 'OK',
      data: CHART_OF_ACCOUNTS
    };
  });

  // GET Expenses Vouchers
  fastify.get('/expenses', async (request, reply) => {
    return {
      status: 'OK',
      data: [
        { id: 101, voucher_no: 'EXP-20260724-01', payee: 'Indian Oil Fuel Pump', category: 'Conveyance', amount: 450, date: '2026-07-24', status: 'APPROVED' },
        { id: 102, voucher_no: 'EXP-20260723-04', payee: 'Sri Krishna Stationery', category: 'Office Supplies', amount: 800, date: '2026-07-23', status: 'APPROVED' },
        { id: 103, voucher_no: 'EXP-20260722-02', payee: 'BSNL Fiber Internet', category: 'Utilities', amount: 1250, date: '2026-07-22', status: 'APPROVED' }
      ]
    };
  });

  // GET Income Statement P&L Report
  fastify.get('/pnl', async (request, reply) => {
    const report = calculateIncomeStatement({
      interestIncome: 420000,
      penaltyIncome: 45000,
      operatingExpenses: 32500
    });
    return {
      status: 'OK',
      fy: '2026-27',
      data: report
    };
  });
}
