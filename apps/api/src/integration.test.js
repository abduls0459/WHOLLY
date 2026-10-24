import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { FitnessData, IslamicData, RefreshSession, StudySession, StudyTimer, Subject, User } from './models/index.js';
import { createApp } from './app.js';
import './env.js';

const testUri = process.env.MONGODB_TEST_URI;
const integration = describe.skipIf(!testUri);

integration('MongoDB API integration', () => {
  const app = createApp();
  const email = 'wholly-' + crypto.randomUUID() + '@example.test';
  let token;
  let userId;
  let subjectId;

  beforeAll(async () => {
    const databaseName = new URL(testUri).pathname.slice(1).split('/')[0];
    if (!databaseName.endsWith('_test')) throw new Error('MONGODB_TEST_URI must target a database whose name ends in _test.');
    await connectDatabase(testUri);
  });

  afterAll(async () => {
    if (userId) {
      await Promise.all([
        User.deleteMany({ _id: userId }), RefreshSession.deleteMany({ user: userId }),
        Subject.deleteMany({ user: userId }), StudySession.deleteMany({ user: userId }),
        StudyTimer.deleteMany({ user: userId }), FitnessData.deleteMany({ user: userId }),
        IslamicData.deleteMany({ user: userId }),
      ]);
    }
    await disconnectDatabase();
  });

  it('registers, restores, updates, logs in, rotates, and logs out an account', async () => {
    const agent = request.agent(app);
    const registration = await agent.post('/api/v1/auth/register').send({
      name: 'Wholly Test', email, password: 'Wholly-password-2026', timezone: 'Asia/Kolkata',
    });
    expect(registration.status).toBe(201);
    userId = registration.body.user.id;
    token = registration.body.accessToken;
    expect(registration.headers['set-cookie'][0]).toContain('HttpOnly');

    const profile = await request(app).get('/api/v1/me').set('Authorization', 'Bearer ' + token);
    expect(profile.status).toBe(200);
    expect(profile.body.user.email).toBe(email);

    const updated = await request(app).patch('/api/v1/me').set('Authorization', 'Bearer ' + token)
      .send({ fitnessGoal: 'fat_loss', onboardingComplete: true });
    expect(updated.status).toBe(200);
    expect(updated.body.settings.fitness_goal).toBe('fat_loss');

    const login = await request(app).post('/api/v1/auth/login').send({ email, password: 'Wholly-password-2026' });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();

    const rotated = await agent.post('/api/v1/auth/refresh');
    expect(rotated.status).toBe(200);
    expect(rotated.body.accessToken).toBeTruthy();
    expect((await agent.post('/api/v1/auth/logout')).status).toBe(204);
  });

  it('isolates Study, Fitness, and Islamic records by authenticated account', async () => {
    const auth = { Authorization: 'Bearer ' + token };
    const createdSubject = await request(app).post('/api/v1/subjects').set(auth).send({ name: 'Biology' });
    expect(createdSubject.status).toBe(201);
    subjectId = createdSubject.body.subject.id;
    const unit = await request(app).post('/api/v1/subjects/' + subjectId + '/items').set(auth).send({ title: 'Cell biology' });
    expect(unit.status).toBe(201);
    const completion = await request(app).patch('/api/v1/subjects/' + subjectId + '/items/' + unit.body.item.id).set(auth).send({ isDone: true });
    expect(completion.body.item.is_done).toBe(true);
    const subjects = await request(app).get('/api/v1/subjects').set(auth);
    expect(subjects.body.subjects[0].completion_percent).toBe(100);

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const water = await request(app).post('/api/v1/fitness/water').set(auth).send({ amountMl: 250, date: today });
    expect(water.status).toBe(201);
    const savedWater = await request(app).get('/api/v1/fitness/water?date=' + today).set(auth);
    expect(savedWater.body.totalMl).toBe(250);

    const islamic = await request(app).put('/api/v1/islamic').set(auth).send({ data: {
      prayers: { [today]: ['Fajr'] }, tahajjud: {}, readings: [], khatam: 0,
      dhikr: [{ id: 'subhanallah', name: 'SubhanAllah', target: 33 }], counts: {},
    } });
    expect(islamic.status).toBe(200);
    expect((await request(app).get('/api/v1/islamic').set(auth)).body.data.prayers[today]).toEqual(['Fajr']);

    const other = await request(app).post('/api/v1/auth/register').send({
      name: 'Other', email: 'other-' + crypto.randomUUID() + '@example.test', password: 'Wholly-password-2026', timezone: 'UTC',
    });
    const denied = await request(app).get('/api/v1/subjects/' + subjectId).set('Authorization', 'Bearer ' + other.body.accessToken);
    expect(denied.status).toBe(404);
    await User.deleteOne({ _id: other.body.user.id });
    await RefreshSession.deleteMany({ user: other.body.user.id });
  });
});
