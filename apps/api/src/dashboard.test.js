import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./models/index.js', () => {
  const selected = (value) => ({ select: () => Promise.resolve(value) });
  return {
    User: { findById: () => selected({ settings: { timezone: 'UTC' } }) },
    IslamicData: { findOne: () => selected(null) },
    FitnessData: { findOne: () => selected({}) },
    Subject: { find: () => selected([]) },
    StudySession: { find: () => selected([]) },
    RefreshSession: {},
    StudyTimer: {},
  };
});

import { createApp } from './app.js';
import { createAccessToken } from './auth.js';

describe('dashboard endpoint', () => {
  it('returns default summaries when existing fitness data has missing arrays', async () => {
    process.env.JWT_ACCESS_SECRET = 'wholly-test-secret-with-at-least-thirty-two-characters';
    const token = await createAccessToken('507f1f77bcf86cd799439011');
    const response = await request(createApp())
      .get('/api/v1/dashboard')
      .set('Authorization', 'Bearer ' + token);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      prayerCount: 0,
      studyMinutes: 0,
      studyTargetMinutes: 180,
      waterMl: 0,
      waterGoalMl: 2500,
      steps: 0,
      stepsTarget: 10000,
      completedMeals: 0,
      mealCount: 4,
      workoutDone: false,
    });
  });
});
