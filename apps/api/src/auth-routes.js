import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { RefreshSession, User } from './models/index.js';
import {
  clearRefreshCookie, cookieName, createAccessToken, createRefreshToken,
  hashRefreshToken, refreshLifetimeMs, requireAccessToken, setRefreshCookie,
} from './auth.js';
import { publicSettings, publicUser, settingsPatch } from './services/user.js';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

const credentials = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
}).strict();
const timezoneSchema = z.string().trim().min(1).max(80).refine((timezone) => {
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(); return true; }
  catch { return false; }
});

function invalid(response, message = 'Please check the submitted data.') {
  return response.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });
}

async function issueSession(user, response) {
  const token = createRefreshToken();
  await RefreshSession.create({
    user: user._id,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + refreshLifetimeMs),
  });
  setRefreshCookie(response, token);
  return { user: { id: String(user._id), name: user.name, email: user.email }, accessToken: await createAccessToken(user._id) };
}

authRouter.post('/auth/register', authLimiter, async (request, response) => {
  const parsed = credentials.extend({
    name: z.string().trim().min(1).max(80),
    timezone: timezoneSchema,
  }).strict().safeParse(request.body);
  if (!parsed.success) return invalid(response, 'Enter a valid name, email, password, and time zone.');
  const email = parsed.data.email.toLowerCase();
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const isIndia = ['Asia/Kolkata', 'Asia/Calcutta'].includes(parsed.data.timezone);
  const user = await User.create({
    name: parsed.data.name, email, passwordHash,
    settings: { timezone: parsed.data.timezone, calcMethod: isIndia ? 1 : 2, asrSchool: isIndia ? 1 : 0 },
  });
  return response.status(201).json(await issueSession(user, response));
});

authRouter.post('/auth/login', authLimiter, async (request, response) => {
  const parsed = credentials.safeParse(request.body);
  if (!parsed.success) return invalid(response, 'Enter a valid email and password.');
  const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash');
  const passwordMatches = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;
  if (!user || !passwordMatches) return response.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } });
  return response.json(await issueSession(user, response));
});

authRouter.post('/auth/refresh', async (request, response) => {
  const oldToken = request.cookies?.[cookieName];
  if (!oldToken) {
    clearRefreshCookie(response);
    return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });
  }
  const current = await RefreshSession.findOneAndUpdate(
    { tokenHash: hashRefreshToken(oldToken), revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date() } }, { new: true },
  );
  if (!current) {
    clearRefreshCookie(response);
    return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });
  }
  const user = await User.findById(current.user);
  if (!user) {
    clearRefreshCookie(response);
    return response.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please sign in.' } });
  }
  return response.json(await issueSession(user, response));
});

authRouter.post('/auth/logout', async (request, response) => {
  const token = request.cookies?.[cookieName];
  if (token) await RefreshSession.updateOne(
    { tokenHash: hashRefreshToken(token), revokedAt: null }, { $set: { revokedAt: new Date() } },
  );
  clearRefreshCookie(response);
  return response.status(204).end();
});

authRouter.get('/me', requireAccessToken, async (request, response) => {
  const user = await User.findById(request.userId);
  if (!user) return response.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'This account was not found.' } });
  return response.json({ user: publicUser(user) });
});

authRouter.patch('/me', requireAccessToken, async (request, response) => {
  const patch = settingsPatch(request.body);
  if (!patch) return invalid(response, 'One or more settings are invalid.');
  const updates = Object.fromEntries(Object.entries(patch).map(([key, value]) => ['settings.' + key, value]));
  if (patch.waterGoalMl !== undefined) updates['settings.waterGoalCustom'] = true;
  const user = await User.findByIdAndUpdate(request.userId, { $set: updates }, { new: true, runValidators: true });
  if (!user) return response.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'This account was not found.' } });
  return response.json({ settings: publicSettings(user.settings.toObject()) });
});
