import fp from 'fastify-plugin';

async function dbPlugin(fastify, options) {
  // Decorate fastify.db with fastify.masterDb for master database queries
  fastify.decorate('db', fastify.masterDb);
}

export default fp(dbPlugin, {
  name: 'db',
  dependencies: ['masterDb']
});
