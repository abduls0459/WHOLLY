import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAccessToken } from './auth.js';
import { FitnessData, User } from './models/index.js';

export const fitnessRouter = Router();
fitnessRouter.use(requireAccessToken);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
});
const idSchema = z.string().refine(mongoose.isValidObjectId);

function fail(response, status, code, message) {
  return response.status(status).json({ error: { code, message } });
}

function localDate(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const result = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return result.year + '-' + result.month + '-' + result.day;
}

async function settings(userId) {
  const user = await User.findById(userId).select('settings');
  return user?.settings;
}

function localTime(date, timezone) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
}

async function getData(userId) {
  let data = await FitnessData.findOne({ user: userId });
  if (data) return data;
  try {
    data = await FitnessData.create({
      user: userId,
      mealSlots: [
        { name: 'Breakfast', timeLocal: '08:00', sortOrder: 0 },
        { name: 'Lunch', timeLocal: '13:00', sortOrder: 1 },
        { name: 'Snack', timeLocal: '16:30', sortOrder: 2 },
        { name: 'Dinner', timeLocal: '20:00', sortOrder: 3 },
      ],
    });
    return data;
  } catch (error) {
    if (error?.code === 11000) return FitnessData.findOne({ user: userId });
    throw error;
  }
}

function waterJson(row) {
  return { id: String(row._id), date: row.date, logged_at: row.loggedAt, amount_ml: row.amountMl };
}

fitnessRouter.get('/fitness/water', async (request, response) => {
  const prefs = await settings(request.userId);
  const date = dateSchema.safeParse(request.query.date ?? localDate(new Date(), prefs?.timezone ?? 'UTC'));
  if (!date.success) return fail(response, 400, 'INVALID_DATE', 'Choose a valid date.');
  const data = await getData(request.userId);
  const entries = data.waterLogs.filter((row) => row.date === date.data).sort((a, b) => a.loggedAt - b.loggedAt);
  return response.json({
    entries: entries.map(waterJson), totalMl: entries.reduce((sum, row) => sum + row.amountMl, 0),
    goalMl: prefs?.waterGoalMl ?? 2500,
  });
});

fitnessRouter.post('/fitness/water', async (request, response) => {
  const parsed = z.object({ amountMl: z.number().int().min(50).max(2000), date: dateSchema.optional() }).strict().safeParse(request.body);
  if (!parsed.success) return fail(response, 400, 'INVALID_WATER_ENTRY', 'Water amount must be between 50 and 2,000 ml.');
  const prefs = await settings(request.userId);
  const date = parsed.data.date ?? localDate(new Date(), prefs?.timezone ?? 'UTC');
  const data = await getData(request.userId);
  data.waterLogs.push({ date, amountMl: parsed.data.amountMl, loggedAt: new Date() });
  await data.save();
  return response.status(201).json({ entry: waterJson(data.waterLogs.at(-1)) });
});

fitnessRouter.delete('/fitness/water', async (request, response) => {
  const prefs = await settings(request.userId);
  const date = dateSchema.safeParse(request.query.date ?? localDate(new Date(), prefs?.timezone ?? 'UTC'));
  if (!date.success) return fail(response, 400, 'INVALID_DATE', 'Choose a valid date.');
  const data = await getData(request.userId);
  const entry = data.waterLogs.filter((row) => row.date === date.data).sort((a, b) => b.loggedAt - a.loggedAt)[0];
  if (entry) { entry.deleteOne(); await data.save(); }
  return response.status(204).end();
});

fitnessRouter.get('/fitness/steps/:date', async (request, response) => {
  const date = dateSchema.safeParse(request.params.date);
  if (!date.success) return fail(response, 400, 'INVALID_DATE', 'Choose a valid date.');
  const data = await getData(request.userId);
  const log = data.stepLogs.find((row) => row.date === date.data);
  return response.json({ date: date.data, steps: log?.steps ?? 0 });
});

fitnessRouter.put('/fitness/steps/:date', async (request, response) => {
  const date = dateSchema.safeParse(request.params.date);
  const parsed = z.object({ steps: z.number().int().min(0).max(100000) }).strict().safeParse(request.body);
  if (!date.success || !parsed.success) return fail(response, 400, 'INVALID_STEP_LOG', 'Steps must be between 0 and 100,000.');
  const data = await getData(request.userId);
  const existing = data.stepLogs.find((row) => row.date === date.data);
  if (existing) existing.steps = parsed.data.steps;
  else data.stepLogs.push({ date: date.data, steps: parsed.data.steps });
  await data.save();
  return response.json({ date: date.data, steps: parsed.data.steps });
});

fitnessRouter.get('/fitness/body', async (request, response) => {
  const from = request.query.from === undefined ? null : dateSchema.safeParse(request.query.from);
  const to = request.query.to === undefined ? null : dateSchema.safeParse(request.query.to);
  if (from && !from.success || to && !to.success || from?.success && to?.success && from.data > to.data) return fail(response, 400, 'INVALID_DATE_RANGE', 'Choose a valid date range.');
  const data = await getData(request.userId);
  const entries = data.bodyLogs.filter((row) => (!from || row.date >= from.data) && (!to || row.date <= to.data))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({
      date: row.date, weight_kg: row.weightKg, waist_cm: row.waistCm ?? null,
      chest_cm: row.chestCm ?? null, hips_cm: row.hipsCm ?? null, biceps_cm: row.bicepsCm ?? null, thigh_cm: row.thighCm ?? null,
    }));
  const prefs = await settings(request.userId);
  return response.json({ entries, goalWeightKg: prefs?.goalWeightKg ?? null });
});

fitnessRouter.put('/fitness/body', async (request, response) => {
  const parsed = z.object({
    date: dateSchema, weightKg: z.number().min(20).max(400),
    waistCm: z.number().positive().max(300).nullable().optional(),
    chestCm: z.number().positive().max(300).nullable().optional(),
    hipsCm: z.number().positive().max(300).nullable().optional(),
    bicepsCm: z.number().positive().max(150).nullable().optional(),
    thighCm: z.number().positive().max(200).nullable().optional(),
  }).strict().safeParse(request.body);
  if (!parsed.success) return fail(response, 400, 'INVALID_BODY_ENTRY', 'Weight and measurement values are invalid.');
  const data = await getData(request.userId);
  const values = {
    date: parsed.data.date, weightKg: parsed.data.weightKg, waistCm: parsed.data.waistCm ?? null,
    chestCm: parsed.data.chestCm ?? null, hipsCm: parsed.data.hipsCm ?? null,
    bicepsCm: parsed.data.bicepsCm ?? null, thighCm: parsed.data.thighCm ?? null,
  };
  const entry = data.bodyLogs.find((row) => row.date === values.date);
  if (entry) Object.assign(entry, values);
  else data.bodyLogs.push(values);
  await data.save();
  return response.json({ entry: {
    date: values.date, weight_kg: values.weightKg, waist_cm: values.waistCm,
    chest_cm: values.chestCm, hips_cm: values.hipsCm, biceps_cm: values.bicepsCm, thigh_cm: values.thighCm,
  } });
});

fitnessRouter.get('/fitness/meals', async (request, response) => {
  const prefs = await settings(request.userId);
  const date = dateSchema.safeParse(request.query.date ?? localDate(new Date(), prefs?.timezone ?? 'UTC'));
  if (!date.success) return fail(response, 400, 'INVALID_DATE', 'Choose a valid date.');
  const data = await getData(request.userId);
  const slots = [...data.mealSlots].sort((a, b) => a.sortOrder - b.sortOrder).map((slot) => {
    const log = data.mealLogs.find((row) => row.slotId === String(slot._id) && row.date === date.data);
    return {
      id: String(slot._id), name: slot.name, time_local: slot.timeLocal, enabled: slot.enabled,
      sort_order: slot.sortOrder, status: log?.status ?? 'pending', logged_at: log?.loggedAt ?? null,
    };
  });
  return response.json({ date: date.data, slots, goal: prefs?.fitnessGoal ?? 'maintain' });
});

fitnessRouter.patch('/fitness/meals/:slotId', async (request, response) => {
  const parsed = z.object({ date: dateSchema, status: z.enum(['eaten', 'skipped']) }).strict().safeParse(request.body);
  if (!idSchema.safeParse(request.params.slotId).success || !parsed.success) return fail(response, 400, 'INVALID_MEAL', 'Meal details are invalid.');
  const data = await getData(request.userId);
  const slot = data.mealSlots.id(request.params.slotId);
  if (!slot || !slot.enabled) return fail(response, 404, 'MEAL_NOT_FOUND', 'This meal slot is unavailable.');
  const now = new Date();
  const prefs = await settings(request.userId);
  const timezone = prefs?.timezone ?? 'UTC';
  const currentDate = localDate(now, timezone);
  const nowTime = localTime(now, timezone);
  const minutesAfter = (Date.parse(currentDate + 'T' + nowTime + ':00Z') - Date.parse(parsed.data.date + 'T' + slot.timeLocal + ':00Z')) / 60000;
  const status = parsed.data.status === 'skipped' ? 'skipped' : minutesAfter <= 60 ? 'on_time' : 'late';
  const current = data.mealLogs.find((row) => row.slotId === String(slot._id) && row.date === parsed.data.date);
  const values = { slotId: String(slot._id), date: parsed.data.date, status, loggedAt: parsed.data.status === 'eaten' ? now : null };
  let savedLog = current;
  if (current) Object.assign(current, values);
  else { data.mealLogs.push(values); savedLog = data.mealLogs.at(-1); }
  await data.save();
  return response.json({ meal: { id: String(savedLog._id), date: values.date, status: values.status, logged_at: values.loggedAt } });
});

fitnessRouter.post('/fitness/meals/slots', async (request, response) => {
  const parsed = z.object({ name: z.string().trim().min(1).max(80), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).strict().safeParse(request.body);
  if (!parsed.success) return fail(response, 400, 'INVALID_MEAL_SLOT', 'Enter a name and a valid local time.');
  const data = await getData(request.userId);
  const slot = data.mealSlots.create({ name: parsed.data.name, timeLocal: parsed.data.time, enabled: true, sortOrder: data.mealSlots.length });
  data.mealSlots.push(slot);
  await data.save();
  return response.status(201).json({ slot: { id: String(slot._id), name: slot.name, time_local: slot.timeLocal, enabled: slot.enabled, sort_order: slot.sortOrder } });
});

fitnessRouter.patch('/fitness/meals/slots/:slotId', async (request, response) => {
  const parsed = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    enabled: z.boolean().optional(),
  }).strict().refine((value) => Object.keys(value).length > 0).safeParse(request.body);
  if (!idSchema.safeParse(request.params.slotId).success || !parsed.success) return fail(response, 400, 'INVALID_MEAL_SLOT', 'Meal slot details are invalid.');
  const data = await getData(request.userId);
  const slot = data.mealSlots.id(request.params.slotId);
  if (!slot) return fail(response, 404, 'MEAL_SLOT_NOT_FOUND', 'This meal slot was not found.');
  if (parsed.data.name !== undefined) slot.name = parsed.data.name;
  if (parsed.data.time !== undefined) slot.timeLocal = parsed.data.time;
  if (parsed.data.enabled !== undefined) slot.enabled = parsed.data.enabled;
  await data.save();
  return response.json({ slot: { id: String(slot._id), name: slot.name, time_local: slot.timeLocal, enabled: slot.enabled, sort_order: slot.sortOrder } });
});

fitnessRouter.delete('/fitness/meals/slots/:slotId', async (request, response) => {
  if (!idSchema.safeParse(request.params.slotId).success) return fail(response, 400, 'INVALID_MEAL_SLOT', 'Meal slot id is invalid.');
  const data = await getData(request.userId);
  const slot = data.mealSlots.id(request.params.slotId);
  if (!slot) return fail(response, 404, 'MEAL_SLOT_NOT_FOUND', 'This meal slot was not found.');
  const slotId = String(slot._id);
  slot.deleteOne();
  data.mealLogs = data.mealLogs.filter((row) => row.slotId !== slotId);
  await data.save();
  return response.status(204).end();
});

function workoutJson(row) {
  return {
    id: String(row._id), date: row.date, title: row.title ?? null, note: row.note ?? null,
    exercises: row.exercises.map((exercise) => ({
      name: exercise.name, sets: exercise.sets.map((set) => ({ reps: set.reps, weightKg: set.weightKg ?? null })),
    })),
  };
}

const workoutSchema = z.object({
  date: dateSchema, title: z.string().trim().max(120).nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  exercises: z.array(z.object({
    name: z.string().trim().min(1).max(100),
    sets: z.array(z.object({ reps: z.number().int().min(1).max(1000), weightKg: z.number().positive().max(1000).nullable().optional() }).strict()).min(1).max(20),
  }).strict()).min(1).max(30),
}).strict();

fitnessRouter.get('/fitness/workouts', async (request, response) => {
  const prefs = await settings(request.userId);
  const today = localDate(new Date(), prefs?.timezone ?? 'UTC');
  const monthAgoDate = new Date(today + 'T12:00:00Z');
  monthAgoDate.setUTCDate(monthAgoDate.getUTCDate() - 30);
  const from = dateSchema.safeParse(request.query.from ?? monthAgoDate.toISOString().slice(0, 10));
  const to = dateSchema.safeParse(request.query.to ?? today);
  if (!from.success || !to.success || from.data > to.data) return fail(response, 400, 'INVALID_DATE_RANGE', 'Choose a valid date range.');
  const data = await getData(request.userId);
  const workouts = data.workouts.filter((row) => row.date >= from.data && row.date <= to.data).sort((a, b) => b.date.localeCompare(a.date));
  const exerciseNames = [...new Set(data.workouts.flatMap((row) => row.exercises.map((item) => item.name)))].sort();
  return response.json({ workouts: workouts.map(workoutJson), exerciseNames });
});

fitnessRouter.post('/fitness/workouts', async (request, response) => {
  const parsed = workoutSchema.safeParse(request.body);
  if (!parsed.success) return fail(response, 400, 'INVALID_WORKOUT', 'Add at least one exercise with 1 to 20 valid sets.');
  const data = await getData(request.userId);
  const workout = data.workouts.create(parsed.data);
  data.workouts.push(workout);
  await data.save();
  return response.status(201).json({ workoutId: String(workout._id) });
});

fitnessRouter.patch('/fitness/workouts/:workoutId', async (request, response) => {
  if (!idSchema.safeParse(request.params.workoutId).success) return fail(response, 400, 'INVALID_WORKOUT', 'Workout id is invalid.');
  const parsed = workoutSchema.safeParse(request.body);
  if (!parsed.success) return fail(response, 400, 'INVALID_WORKOUT', 'Workout details are invalid.');
  const data = await getData(request.userId);
  const workout = data.workouts.id(request.params.workoutId);
  if (!workout) return fail(response, 404, 'WORKOUT_NOT_FOUND', 'This workout was not found.');
  Object.assign(workout, parsed.data);
  await data.save();
  return response.json({ workoutId: String(workout._id) });
});

fitnessRouter.post('/fitness/workouts/:workoutId/copy', async (request, response) => {
  if (!idSchema.safeParse(request.params.workoutId).success) return fail(response, 400, 'INVALID_WORKOUT', 'Workout id is invalid.');
  const data = await getData(request.userId);
  const source = data.workouts.id(request.params.workoutId);
  if (!source) return fail(response, 404, 'WORKOUT_NOT_FOUND', 'This workout was not found.');
  const prefs = await settings(request.userId);
  const workout = data.workouts.create({
    date: localDate(new Date(), prefs?.timezone ?? 'UTC'), title: source.title, note: source.note,
    exercises: source.exercises.map((exercise) => ({ name: exercise.name, sets: exercise.sets.map((set) => ({ reps: set.reps, weightKg: set.weightKg })) })),
  });
  data.workouts.push(workout);
  await data.save();
  return response.status(201).json({ workoutId: String(workout._id) });
});

fitnessRouter.delete('/fitness/workouts/:workoutId', async (request, response) => {
  if (!idSchema.safeParse(request.params.workoutId).success) return fail(response, 400, 'INVALID_WORKOUT', 'Workout id is invalid.');
  const data = await getData(request.userId);
  const workout = data.workouts.id(request.params.workoutId);
  if (!workout) return fail(response, 404, 'WORKOUT_NOT_FOUND', 'This workout was not found.');
  workout.deleteOne();
  await data.save();
  return response.status(204).end();
});

fitnessRouter.get('/fitness/schedule', async (request, response) => {
  const prefs = await settings(request.userId);
  const today = localDate(new Date(), prefs?.timezone ?? 'UTC');
  const todayDate = new Date(today + 'T12:00:00Z');
  const weekStart = new Date(todayDate);
  weekStart.setUTCDate(todayDate.getUTCDate() - ((todayDate.getUTCDay() + 6) % 7));
  const from = weekStart.toISOString().slice(0, 10);
  const data = await getData(request.userId);
  const plan = new Set(data.workoutWeekdays);
  const completed = new Set(data.workouts.map((row) => row.date));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setUTCDate(weekStart.getUTCDate() + index);
    const dateKey = date.toISOString().slice(0, 10);
    const weekday = date.getUTCDay();
    const isWorkoutDay = plan.has(weekday);
    const status = completed.has(dateKey) ? 'workout_done' : isWorkoutDay && dateKey < today ? 'not_done' : isWorkoutDay ? 'planned' : 'rest';
    return { date: dateKey, weekday, isWorkoutDay, status };
  });
  return response.json({ days, schedule: days.map(({ weekday, isWorkoutDay }) => ({ weekday, isWorkoutDay })) });
});

fitnessRouter.put('/fitness/schedule', async (request, response) => {
  const parsed = z.object({ weekdays: z.array(z.number().int().min(0).max(6)).max(7) }).strict().safeParse(request.body);
  if (!parsed.success || new Set(parsed.data.weekdays).size !== parsed.data.weekdays.length) return fail(response, 400, 'INVALID_SCHEDULE', 'Choose valid weekdays.');
  const data = await getData(request.userId);
  data.workoutWeekdays = parsed.data.weekdays;
  await data.save();
  return response.json({ weekdays: parsed.data.weekdays });
});
