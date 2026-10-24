import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

if (!process.env.WEB_ORIGIN) process.env.WEB_ORIGIN = 'http://localhost:5173';

export function validateEnvironment() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must contain at least 32 characters.');
  }
  const port = Number(process.env.API_PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('API_PORT must be a valid TCP port.');
}
