import Fastify from 'fastify';
import { registerHealthRoutes } from './routes/health.js';
import { registerMeRoutes } from './routes/me.js';

export function createServer() {
  const app = Fastify({ logger: true });

  registerHealthRoutes(app);
  registerMeRoutes(app);

  return app;
}

const app = createServer();
const port = Number(process.env.PORT ?? 3001);

app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`API listening on ${port}`);
}).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
