import loanRoutes from './loan/loan.routes.js';
import borrowerRoutes from './borrower/borrower.routes.js';
import collectionRoutes from './collection/collection.routes.js';
import ledgerRoutes from './ledger/ledger.routes.js';
import npaRoutes from './npa/npa.routes.js';
import schemeRoutes from './scheme/scheme.routes.js';
import investorRoutes from './investors/investor.routes.js';
import fixedDepositRoutes from './fixedDeposits/fixedDeposit.routes.js';
import recurringDepositRoutes from './recurringDeposits/recurringDeposit.routes.js';
import expenseRoutes from './expenses/expense.routes.js';
import bankRoutes from './bank/bank.routes.js';
import eodRoutes from './eod/eod.routes.js';
import fyRoutes from './fy/fy.routes.js';

export default async function financeRoutes(fastify, opts) {
  await fastify.register(loanRoutes);
  await fastify.register(borrowerRoutes);
  await fastify.register(collectionRoutes);
  await fastify.register(ledgerRoutes);
  await fastify.register(npaRoutes);
  await fastify.register(schemeRoutes);
  await fastify.register(investorRoutes);
  await fastify.register(fixedDepositRoutes);
  await fastify.register(recurringDepositRoutes);
  await fastify.register(expenseRoutes);
  await fastify.register(bankRoutes, { prefix: '/bank-accounts' });
  await fastify.register(eodRoutes, { prefix: '/eod' });
  await fastify.register(fyRoutes);
}

