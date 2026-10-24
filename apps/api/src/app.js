import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { authRouter } from './auth-routes.js';
import { studyRouter } from './study-routes.js';
import { fitnessRouter } from './fitness-routes.js';
import { islamicRouter } from './islamic-routes.js';
import { dashboardRouter } from './dashboard-routes.js';
import { errorHandler, notFound } from './middleware/errors.js';
import './env.js';

export function createApp() {
  const app = express();
  const allowedOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';

  app.disable('x-powered-by');
  app.use(helmet());
  app.use((request, response, next) => {
    const origin = request.get('origin');
    if (origin && origin === allowedOrigin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }
    if (request.method === 'OPTIONS') return response.status(origin === allowedOrigin ? 204 : 403).end();
    return next();
  });
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/v1/health', (_request, response) => {
    response.json({ status: 'ok', service: 'wholly-api' });
  });
  app.use('/api/v1', authRouter);
  app.use('/api/v1', studyRouter);
  app.use('/api/v1', fitnessRouter);
  app.use('/api/v1', islamicRouter);
  app.use('/api/v1', dashboardRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
