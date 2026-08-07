import loanRoutes from './loan/loan.routes.js';
import borrowerRoutes from './borrower/borrower.routes.js';
import collectionRoutes from './collection/collection.routes.js';
import ledgerRoutes from './ledger/ledger.routes.js';
import npaRoutes from './npa/npa.routes.js';

export default async function financeRoutes(fastify, opts) {
  await fastify.register(loanRoutes);
  await fastify.register(borrowerRoutes);
  await fastify.register(collectionRoutes);
  await fastify.register(ledgerRoutes);
  await fastify.register(npaRoutes);
}
