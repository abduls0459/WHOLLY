import { validateEnvironment } from './env.js';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

const port = Number(process.env.API_PORT ?? 4000);
const server = createServer(createApp());
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log('Shutting down Wholly API (' + signal + ').');
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

try {
  validateEnvironment();
  await connectDatabase();
  server.listen(port, () => console.log('Wholly API listening on http://localhost:' + port));
} catch (error) {
  console.log(error)
  console.error('Could not connect to MongoDB. Check MONGODB_URI and network access.');
  process.exitCode = 1;
  await disconnectDatabase();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
