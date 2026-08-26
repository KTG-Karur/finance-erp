---
name: multi-tenant-db
description: Management of Database-per-Tenant model, MySQL schema migrations, master vs tenant DB context, and dynamic pool caching in Fastify.
---

# Multi-Tenant DB Skill

## Architectural Pattern
- **Master DB (`master_erp_db`)**: Manages tenant registry (`companies`), authentication credentials (`master_users`), subscriptions, and global audit logs.
- **Tenant DB (`tenant_<code_or_id>_db`)**: Isolated schema per client containing loans, borrowers, ledger accounts, journal entries, and employees.

## Implementation Guidelines
1. **Context Isolation**:
   - Access tenant DB via request context `req.tenantDb`.
   - Access central master DB via `fastify.masterDb`.
   - Never write tenant operational data into the master database.
2. **Connection Pooling (`tenantDb.js`)**:
   - Dynamic connection pools are cached by tenant DB name with LRU eviction (15 min idle timeout).
   - Ensure dynamic queries obtain a connection from `req.tenantDb`, execute, and release connections safely when using manual transactions (`connection.release()`).
3. **Prepared Statements & Transactions**:
   - Always parameterize dynamic queries to avoid SQL injection.
   - For multi-step operational changes (e.g. loan disbursement + general ledger entry), acquire a dedicated connection:
     ```js
     const conn = await req.tenantDb.getConnection();
     try {
       await conn.beginTransaction();
       // execute operations
       await conn.commit();
     } catch (err) {
       await conn.rollback();
       throw err;
     } finally {
       conn.release();
     }
     ```
4. **Schema Migrations (Strict Separate Files)**:
   - Always create new schema changes as separate timestamped files under `server/src/tenant-configuration/migrations/YYYYMMDDNNNNNN-<name>.js` (for tenant DBs) or `server/src/database/migrations/YYYYMMDDNNNNNN-<name>.js` (for master DB).
   - Never mutate historical base migrations.
   - Export both `up(queryInterface, Sequelize)` and `down(queryInterface, Sequelize)`.

