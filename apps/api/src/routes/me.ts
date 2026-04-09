import type { FastifyInstance } from 'fastify';

export function registerMeRoutes(app: FastifyInstance) {
  app.get('/api/v1/me', async () => {
    return {
      data: {
        user: {
          id: '00000000-0000-0000-0000-000000000000',
          login: 'bootstrap-user',
          displayName: 'Bootstrap User',
          email: null
        },
        permissions: []
      },
      meta: {
        requestId: 'bootstrap'
      }
    };
  });
}
