import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAccessToken } from './auth.js';
import { StudySession, StudyTimer, Subject, User } from './models/index.js';

export const studyRouter = Router();
studyRouter.use(requireAccessToken);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
});
const idSchema = z.string().refine(mongoose.isValidObjectId, 'Invalid id');

function fail(response, status, code, message) {
  return response.status(status).json({ error: { code, message } });
}

function itemJson(item, subjectId) {
  return {
    id: String(item._id), subject_id: String(subjectId),
    parent_id: item.parentId ? String(item.parentId) : null,
    item_type: item.itemType, title: item.title, est_minutes: item.estMinutes,
    is_done: item.isDone, done_at: item.doneAt, sort_order: item.sortOrder,
  };
}

function subjectJson(subject, sessions = []) {
  const items = subject.items.map((item) => itemJson(item, subject._id)).sort((a, b) => a.sort_order - b.sort_order);
  const units = items.filter((item) => item.item_type === 'unit');
  const topics = items.filter((item) => item.item_type === 'topic');
  const leaves = units.flatMap((unit) => {
    const children = topics.filter((topic) => topic.parent_id === unit.id);
    return children.length ? children : [unit];
  });
  const done = leaves.filter((item) => item.is_done).length;
  const weeklySeconds = sessions.filter((session) => String(session.subject) === String(subject._id))
    .reduce((sum, session) => sum + session.durationSec, 0);
  return {
    id: String(subject._id), name: subject.name, color: subject.color,
    exam_date: subject.examDate, archived: subject.archived, sort_order: subject.sortOrder,
    completion_percent: leaves.length ? Math.round(done / leaves.length * 100) : 0,
    weekly_minutes: Math.floor(weeklySeconds / 60),
    units: units.map((unit) => {
      const children = topics.filter((topic) => topic.parent_id === unit.id);
      const completed = children.length ? children.filter((topic) => topic.is_done).length : Number(unit.is_done);
      return { ...unit, completion_percent: children.length ? Math.round(completed / children.length * 100) : Number(unit.is_done) * 100, topics: children };
    }),
  };
}

function dateInZone(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + '-' + values.month + '-' + values.day;
}

function addDays(date, count) {
  const result = new Date(date + 'T12:00:00Z');
  result.setUTCDate(result.getUTCDate() + count);
  return result.toISOString().slice(0, 10);
}

function dayDifference(from, to) {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000);
}

function nextLocalDayBoundary(start, end, timezone) {
  const day = dateInZone(start, timezone);
  if (dateInZone(new Date(end.getTime() - 1), timezone) === day) return end;
  let low = start.getTime();
  let high = end.getTime();
  while (high - low > 1) {
    const middle = Math.floor((low + high) / 2);
    if (dateInZone(new Date(middle), timezone) === day) low = middle;
    else high = middle;
  }
  return new Date(high);
}

async function ownedSubject(userId, subjectId, active = false) {
  if (!mongoose.isValidObjectId(subjectId)) return null;
  return Subject.findOne({ _id: subjectId, user: userId, ...(active ? { archived: false } : {}) });
}

studyRouter.get('/subjects', async (request, response) => {
  const includeArchived = request.query.includeArchived === 'true';
  const filter = { user: request.userId, ...(includeArchived ? {} : { archived: false }) };
  const subjects = await Subject.find(filter).sort({ sortOrder: 1, createdAt: 1 });
  const user = await User.findById(request.userId).select('settings.timezone');
  const today = dateInZone(new Date(), user?.settings.timezone ?? 'UTC');
  const since = addDays(today, -6);
  const sessions = await StudySession.find({ user: request.userId, date: { $gte: since, $lte: today } }).select('subject durationSec');
  return response.json({ subjects: subjects.map((subject) => subjectJson(subject, sessions)) });
});

studyRouter.get('/subjects/:subjectId', async (request, response) => {
  if (!idSchema.safeParse(request.params.subjectId).success) return fail(response, 400, 'INVALID_SUBJECT', 'Subject id is invalid.');
  const subject = await ownedSubject(request.userId, request.params.subjectId);
  if (!subject) return fail(response, 404, 'SUBJECT_NOT_FOUND', 'This subject was not found.');
  return response.json({ subject: subjectJson(subject) });
});

studyRouter.post('/subjects', async (request, response) => {
  const parsed = z.object({
    name: z.string().trim().min(1).max(100),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#82977c'),
    examDate: dateSchema.nullable().optional(),
  }).strict().safeParse(request.body);
  if (!parsed.success) return fail(response, 400, 'INVALID_REQUEST', 'Enter a subject name and a valid colour or exam date.');
  const sortOrder = await Subject.countDocuments({ user: request.userId });
  const subject = await Subject.create({ ...parsed.data, examDate: parsed.data.examDate ?? null, user: request.userId, sortOrder });
  return response.status(201).json({ subject: subjectJson(subject) });
});

studyRouter.patch('/subjects/:subjectId', async (request, response) => {
  const parsed = z.object({
    name: z.string().trim().min(1).max(100), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    examDate: dateSchema.nullable().optional(), archived: z.boolean().optional(), sortOrder: z.number().int().min(0).optional(),
  }).partial().strict().refine((value) => Object.keys(value).length > 0).safeParse(request.body);
  if (!idSchema.safeParse(request.params.subjectId).success || !parsed.success) return fail(response, 400, 'INVALID_SUBJECT', 'Subject details are invalid.');
  const updates = { ...parsed.data };
  if (Object.hasOwn(updates, 'examDate')) updates.examDate = updates.examDate ?? null;
  const subject = await Subject.findOneAndUpdate(
    { _id: request.params.subjectId, user: request.userId }, { $set: updates }, { new: true, runValidators: true },
  );
  if (!subject) return fail(response, 404, 'SUBJECT_NOT_FOUND', 'This subject was not found.');
  return response.json({ subject: subjectJson(subject) });
});

studyRouter.delete('/subjects/:subjectId', async (request, response) => {
  if (!idSchema.safeParse(request.params.subjectId).success) return fail(response, 400, 'INVALID_SUBJECT', 'Subject id is invalid.');
  const subject = await Subject.findOneAndDelete({ _id: request.params.subjectId, user: request.userId });
  if (!subject) return fail(response, 404, 'SUBJECT_NOT_FOUND', 'This subject was not found.');
  await Promise.all([
    StudySession.deleteMany({ user: request.userId, subject: subject._id }),
    StudyTimer.deleteOne({ user: request.userId, subject: subject._id }),
  ]);
  return response.status(204).end();
});

studyRouter.post('/subjects/:subjectId/items', async (request, response) => {
  const subject = await ownedSubject(request.userId, request.params.subjectId, true);
  if (!subject) return fail(response, 404, 'SUBJECT_NOT_FOUND', 'This subject was not found.');
  const parsed = z.object({
    parentId: idSchema.optional(), title: z.string().trim().min(1).max(160),
    estMinutes: z.number().int().min(0).max(100000).default(120),
  }).strict().safeParse(request.body);
  if (!parsed.success) return fail(response, 400, 'INVALID_ITEM', 'Syllabus item details are invalid.');
  if (parsed.data.parentId) {
    const parent = subject.items.id(parsed.data.parentId);
    if (!parent || parent.itemType !== 'unit') return fail(response, 400, 'INVALID_PARENT', 'Choose a unit in this subject.');
  }
  const siblings = subject.items.filter((item) => String(item.parentId ?? '') === (parsed.data.parentId ?? ''));
  const item = {
    ...parsed.data, parentId: parsed.data.parentId ?? null,
    itemType: parsed.data.parentId ? 'topic' : 'unit', sortOrder: siblings.length,
  };
  subject.items.push(item);
  await subject.save();
  const created = subject.items.at(-1);
  return response.status(201).json({ item: itemJson(created, subject._id) });
});

studyRouter.patch('/subjects/:subjectId/items/:itemId', async (request, response) => {
  const parsed = z.object({
    title: z.string().trim().min(1).max(160).optional(),
    estMinutes: z.number().int().min(0).max(100000).optional(), isDone: z.boolean().optional(), sortOrder: z.number().int().min(0).optional(),
  }).strict().refine((value) => Object.keys(value).length > 0).safeParse(request.body);
  if (!idSchema.safeParse(request.params.subjectId).success || !idSchema.safeParse(request.params.itemId).success || !parsed.success) {
    return fail(response, 400, 'INVALID_ITEM', 'Syllabus item details are invalid.');
  }
  const subject = await ownedSubject(request.userId, request.params.subjectId);
  const item = subject?.items.id(request.params.itemId);
  if (!item) return fail(response, 404, 'ITEM_NOT_FOUND', 'This syllabus item was not found.');
  if (parsed.data.title !== undefined) item.title = parsed.data.title;
  if (parsed.data.estMinutes !== undefined) item.estMinutes = parsed.data.estMinutes;
  if (parsed.data.sortOrder !== undefined) item.sortOrder = parsed.data.sortOrder;
  if (parsed.data.isDone !== undefined) { item.isDone = parsed.data.isDone; item.doneAt = item.isDone ? new Date() : null; }
  await subject.save();
  return response.json({ item: itemJson(item, subject._id) });
});

studyRouter.delete('/subjects/:subjectId/items/:itemId', async (request, response) => {
  if (!idSchema.safeParse(request.params.subjectId).success || !idSchema.safeParse(request.params.itemId).success) return fail(response, 400, 'INVALID_ITEM', 'Syllabus item id is invalid.');
  const subject = await ownedSubject(request.userId, request.params.subjectId);
  const item = subject?.items.id(request.params.itemId);
  if (!item) return fail(response, 404, 'ITEM_NOT_FOUND', 'This syllabus item was not found.');
  const childIds = subject.items.filter((row) => String(row.parentId ?? '') === String(item._id)).map((row) => String(row._id));
  subject.items = subject.items.filter((row) => !row._id.equals(item._id) && !childIds.includes(String(row._id)));
  await subject.save();
  return response.status(204).end();
});

studyRouter.get('/study/sessions', async (request, response) => {
  const user = await User.findById(request.userId).select('settings.timezone');
  const today = dateInZone(new Date(), user?.settings.timezone ?? 'UTC');
  const from = dateSchema.safeParse(request.query.from ?? today);
  const to = dateSchema.safeParse(request.query.to ?? request.query.from ?? today);
  if (!from.success || !to.success || from.data > to.data) return fail(response, 400, 'INVALID_DATE_RANGE', 'Choose a valid date range.');
  const rows = await StudySession.find({ user: request.userId, date: { $gte: from.data, $lte: to.data } })
    .populate('subject', 'name color').sort({ startedAt: -1 }).limit(500);
  return response.json({ sessions: rows.map((row) => ({
    id: String(row._id), subject_id: String(row.subject._id), subject_name: row.subject.name, subject_color: row.subject.color,
    date: row.date, started_at: row.startedAt, ended_at: row.endedAt, duration_sec: row.durationSec, source: row.source, note: row.note,
  })) });
});

studyRouter.post('/study/sessions', async (request, response) => {
  const parsed = z.object({
    subjectId: idSchema, date: dateSchema, minutes: z.number().int().min(1).max(1440),
    note: z.string().trim().max(500).nullable().optional(),
  }).strict().safeParse(request.body);
  if (!parsed.success) return fail(response, 400, 'INVALID_SESSION', 'Enter a subject, date, and duration of at least one minute.');
  const subject = await ownedSubject(request.userId, parsed.data.subjectId, true);
  if (!subject) return fail(response, 404, 'SUBJECT_NOT_FOUND', 'Choose an active subject.');
  const start = new Date(parsed.data.date + 'T00:00:00.000Z');
  const session = await StudySession.create({
    user: request.userId, subject: subject._id, date: parsed.data.date,
    startedAt: start, endedAt: new Date(start.getTime() + parsed.data.minutes * 60000),
    durationSec: parsed.data.minutes * 60, source: 'manual', note: parsed.data.note ?? null,
  });
  return response.status(201).json({ session: {
    id: String(session._id), subject_id: String(subject._id), date: session.date,
    duration_sec: session.durationSec, source: session.source, note: session.note,
    started_at: session.startedAt, ended_at: session.endedAt,
  } });
});

studyRouter.patch('/study/sessions/:sessionId', async (request, response) => {
  const parsed = z.object({
    subjectId: idSchema, date: dateSchema, minutes: z.number().int().min(1).max(1440),
    note: z.string().trim().max(500).nullable().optional(),
  }).strict().safeParse(request.body);
  if (!idSchema.safeParse(request.params.sessionId).success || !parsed.success) return fail(response, 400, 'INVALID_SESSION', 'Session details are invalid.');
  const subject = await ownedSubject(request.userId, parsed.data.subjectId);
  if (!subject) return fail(response, 404, 'SUBJECT_NOT_FOUND', 'This subject was not found.');
  const start = new Date(parsed.data.date + 'T00:00:00.000Z');
  const session = await StudySession.findOneAndUpdate(
    { _id: request.params.sessionId, user: request.userId },
    { subject: subject._id, date: parsed.data.date, startedAt: start, endedAt: new Date(start.getTime() + parsed.data.minutes * 60000), durationSec: parsed.data.minutes * 60, note: parsed.data.note ?? null },
    { new: true },
  );
  if (!session) return fail(response, 404, 'SESSION_NOT_FOUND', 'This study session was not found.');
  return response.json({ session: { id: String(session._id), subject_id: String(subject._id), date: session.date, duration_sec: session.durationSec, source: session.source, note: session.note, started_at: session.startedAt, ended_at: session.endedAt } });
});

studyRouter.delete('/study/sessions/:sessionId', async (request, response) => {
  if (!idSchema.safeParse(request.params.sessionId).success) return fail(response, 400, 'INVALID_SESSION', 'Session id is invalid.');
  const result = await StudySession.deleteOne({ _id: request.params.sessionId, user: request.userId });
  if (!result.deletedCount) return fail(response, 404, 'SESSION_NOT_FOUND', 'This study session was not found.');
  return response.status(204).end();
});

studyRouter.get('/study/timer', async (request, response) => {
  const timer = await StudyTimer.findOne({ user: request.userId }).populate('subject', 'name');
  if (!timer) return response.json({ timer: null });
  const elapsed = timer.segments.reduce((sum, segment) => sum + Math.max(0, Math.floor((segment.end - segment.start) / 1000)), 0)
    + (timer.activeSince ? Math.max(0, Math.floor((Date.now() - timer.activeSince.getTime()) / 1000)) : 0);
  return response.json({ timer: {
    subject_id: String(timer.subject._id), subject_name: timer.subject.name,
    started_at: timer.startedAt, paused_at: timer.pausedAt, active_since: timer.activeSince, elapsed_sec: elapsed,
  } });
});

studyRouter.post('/study/timer/start', async (request, response) => {
  const parsed = z.object({ subjectId: idSchema }).strict().safeParse(request.body);
  if (!parsed.success) return fail(response, 400, 'INVALID_SUBJECT', 'Choose a subject before starting the timer.');
  const subject = await ownedSubject(request.userId, parsed.data.subjectId, true);
  if (!subject) return fail(response, 404, 'SUBJECT_NOT_FOUND', 'Choose an active subject.');
  try {
    await StudyTimer.create({ user: request.userId, subject: subject._id, startedAt: new Date(), activeSince: new Date() });
  } catch (error) {
    if (error?.code === 11000) return fail(response, 409, 'TIMER_ALREADY_RUNNING', 'Stop or resume the current study timer first.');
    throw error;
  }
  return response.status(201).json({ started: true });
});

studyRouter.post('/study/timer/pause', async (request, response) => {
  const timer = await StudyTimer.findOne({ user: request.userId });
  if (!timer) return fail(response, 404, 'TIMER_NOT_FOUND', 'There is no running study timer.');
  if (timer.pausedAt) return fail(response, 409, 'TIMER_PAUSED', 'The timer is already paused.');
  const now = new Date();
  if (timer.activeSince) timer.segments.push({ start: timer.activeSince, end: now });
  timer.activeSince = null;
  timer.pausedAt = now;
  await timer.save();
  return response.json({ paused: true });
});

studyRouter.post('/study/timer/resume', async (request, response) => {
  const timer = await StudyTimer.findOne({ user: request.userId, pausedAt: { $ne: null } });
  if (!timer) return fail(response, 409, 'TIMER_NOT_PAUSED', 'Pause the timer before resuming it.');
  timer.pausedAt = null;
  timer.activeSince = new Date();
  await timer.save();
  return response.json({ resumed: true });
});

studyRouter.post('/study/timer/stop', async (request, response) => {
  const parsed = z.object({ discardShort: z.boolean().default(false) }).strict().safeParse(request.body ?? {});
  if (!parsed.success) return fail(response, 400, 'INVALID_REQUEST', 'Timer request is invalid.');
  const timer = await StudyTimer.findOne({ user: request.userId });
  if (!timer) return fail(response, 404, 'TIMER_NOT_FOUND', 'There is no running study timer.');
  const now = new Date();
  const segments = timer.segments.map((segment) => ({ start: segment.start, end: segment.end }));
  if (timer.activeSince) segments.push({ start: timer.activeSince, end: now });
  const totalSeconds = segments.reduce((sum, segment) => sum + Math.max(0, Math.floor((segment.end - segment.start) / 1000)), 0);
  if (totalSeconds < 60 && !parsed.data.discardShort) return fail(response, 409, 'SESSION_TOO_SHORT', 'This session is ' + totalSeconds + ' seconds. Stop and discard it?');
  if (totalSeconds < 60) {
    await StudyTimer.deleteOne({ _id: timer._id, user: request.userId });
    return response.json({ discarded: true, durationSec: totalSeconds });
  }
  const user = await User.findById(request.userId).select('settings.timezone');
  const timezone = user?.settings.timezone ?? 'UTC';
  const grouped = new Map();
  for (const segment of segments) {
    let cursor = segment.start;
    while (cursor < segment.end) {
      const date = dateInZone(cursor, timezone);
      const endOfDay = nextLocalDayBoundary(cursor, segment.end, timezone);
      grouped.set(date, (grouped.get(date) ?? 0) + Math.floor((endOfDay - cursor) / 1000));
      cursor = endOfDay;
    }
  }
  const sessions = [...grouped].filter(([, seconds]) => seconds > 0).map(([date, durationSec]) => ({
    user: request.userId, subject: timer.subject, date,
    startedAt: timer.startedAt, endedAt: now, durationSec, source: 'timer',
  }));
  if (sessions.length) await StudySession.insertMany(sessions);
  await StudyTimer.deleteOne({ _id: timer._id, user: request.userId });
  return response.json({ saved: true, durationSec: totalSeconds });
});

studyRouter.get('/study/analytics', async (request, response) => {
  const from = dateSchema.safeParse(request.query.from);
  const to = dateSchema.safeParse(request.query.to);
  if (!from.success || !to.success || from.data > to.data) return fail(response, 400, 'INVALID_DATE_RANGE', 'Choose a valid date range.');
  const sessions = await StudySession.find({ user: request.userId, date: { $gte: from.data, $lte: to.data } }).populate('subject', 'name color');
  const rows = new Map();
  for (const session of sessions) {
    const subject = session.subject;
    const key = session.date + ':' + subject._id;
    const current = rows.get(key) ?? { date: session.date, subject_id: String(subject._id), subject: subject.name, color: subject.color, minutes: 0 };
    current.minutes += Math.floor(session.durationSec / 60);
    rows.set(key, current);
  }
  return response.json({ rows: [...rows.values()].sort((a, b) => a.date.localeCompare(b.date)) });
});

studyRouter.get('/study/planner', async (request, response) => {
  const user = await User.findById(request.userId).select('settings');
  const timezone = user?.settings.timezone ?? 'UTC';
  const today = dateInZone(new Date(), timezone);
  const bufferDays = user?.settings.revisionBufferDays ?? 0;
  const dailyTarget = user?.settings.studyDailyTargetMin ?? 180;
  const subjects = await Subject.find({ user: request.userId, archived: false, examDate: { $ne: null } }).sort({ examDate: 1, sortOrder: 1 });
  const plans = [];
  for (const subject of subjects) {
    const units = subject.items.filter((item) => item.itemType === 'unit');
    const topics = subject.items.filter((item) => item.itemType === 'topic');
    const remaining = units.flatMap((unit) => {
      const children = topics.filter((topic) => String(topic.parentId) === String(unit._id));
      return children.length ? children.filter((topic) => !topic.isDone) : unit.isDone ? [] : [unit];
    });
    const remainingMinutes = remaining.reduce((sum, item) => sum + item.estMinutes, 0);
    const daysLeft = dayDifference(today, subject.examDate);
    const target = daysLeft < 0 ? null : Math.ceil(remainingMinutes / Math.max(1, daysLeft - bufferDays));
    const history = await StudySession.find({ user: request.userId, subject: subject._id, date: { $gte: addDays(today, -6), $lte: today } }).select('durationSec');
    const average = history.reduce((sum, item) => sum + item.durationSec, 0) / 7 / 60;
    plans.push({
      subjectId: String(subject._id), subject: subject.name, color: subject.color, examDate: subject.examDate,
      daysLeft, remainingTopics: remaining.length, remainingMinutes, perDayMinutes: target,
      status: daysLeft < 0 ? 'past' : average >= (target ?? 0) ? 'on_track' : 'behind',
    });
  }
  return response.json({ plans, revisionBufferDays: bufferDays, dailyTargetMinutes: dailyTarget });
});
