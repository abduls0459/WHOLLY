import { Router } from 'express';
import { z } from 'zod';
import { requireAccessToken } from './auth.js';
import { IslamicData } from './models/index.js';

export const islamicRouter = Router();
islamicRouter.use(requireAccessToken);

const dateKey = /^\d{4}-\d{2}-\d{2}$/;
const dataSchema = z.object({
  prayers: z.record(z.string().regex(dateKey), z.array(z.enum(['Fajr', 'Zuhr', 'Asr', 'Maghrib', 'Isha']))).default({}),
  tahajjud: z.record(z.string().regex(dateKey), z.object({ rakaat: z.number().int().min(2).max(12), note: z.string().max(500) }).strict()).default({}),
  readings: z.array(z.object({
    id: z.string().max(80), surah: z.number().int().min(1).max(114),
    from: z.number().int().min(1).max(286), to: z.number().int().min(1).max(286), date: z.string().regex(dateKey),
  }).strict()).max(10000).default([]),
  khatam: z.number().int().min(0).max(100000).default(0),
  dhikr: z.array(z.object({
    id: z.string().max(80), name: z.string().trim().min(1).max(60), target: z.number().int().min(1).max(10000),
    archived: z.boolean().optional(),
  }).strict()).max(100).default([]),
  counts: z.record(z.string().regex(dateKey), z.record(z.string().max(80), z.number().int().min(0).max(1000000))).default({}),
}).strict();

islamicRouter.get('/islamic', async (request, response) => {
  const stored = await IslamicData.findOne({ user: request.userId }).select('data');
  return response.json({ data: stored?.data ?? null });
});

islamicRouter.put('/islamic', async (request, response) => {
  const parsed = dataSchema.safeParse(request.body?.data);
  if (!parsed.success || JSON.stringify(request.body?.data ?? '').length > 1_000_000) {
    return response.status(400).json({ error: { code: 'INVALID_ISLAMIC_DATA', message: 'Islamic tracking data is invalid.' } });
  }
  const data = await IslamicData.findOneAndUpdate(
    { user: request.userId }, { $set: { data: parsed.data }, $setOnInsert: { user: request.userId } },
    { upsert: true, new: true, runValidators: true },
  );
  return response.json({ data: data.data });
});
