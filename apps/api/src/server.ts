import { createServer } from './index.js';

const app = createServer();
const port = Number(process.env.PORT ?? 4000);

app
  .listen({ port, host: '0.0.0.0' })
  .then(() => {
    app.log.info(`API listening on ${port}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
