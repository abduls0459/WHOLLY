import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';
import { createAccessToken } from './auth.js';

process.env.JWT_ACCESS_SECRET = 'wholly-test-secret-with-at-least-thirty-two-characters';

describe('API foundation', () => {
  const app = createApp();

  it('reports that the API is ready', async () => {
    const response = await request(app).get('/api/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', service: 'wholly-api' });
  });

  it('rejects malformed registration data before database access', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({ email: 'invalid', password: 'short' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('protects private endpoints from unauthenticated requests', async () => {
    const response = await request(app).get('/api/v1/subjects');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('validates account-scoped writes and record ids before database access', async () => {
    const token = await createAccessToken('507f1f77bcf86cd799439011');
    const auth = { Authorization: 'Bearer ' + token };

    const badWater = await request(app).post('/api/v1/fitness/water').set(auth).send({ amountMl: 4000 });
    expect(badWater.status).toBe(400);
    expect(badWater.body.error.code).toBe('INVALID_WATER_ENTRY');

    const badId = await request(app).get('/api/v1/subjects/not-an-object-id').set(auth);
    expect(badId.status).toBe(400);
    expect(badId.body.error.code).toBe('INVALID_SUBJECT');

    const badIslamicData = await request(app).put('/api/v1/islamic').set(auth).send({ data: { prayers: [] } });
    expect(badIslamicData.status).toBe(400);
    expect(badIslamicData.body.error.code).toBe('INVALID_ISLAMIC_DATA');
  });
});
