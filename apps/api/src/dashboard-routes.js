import { Router } from 'express';
import { requireAccessToken } from './auth.js';
import { FitnessData, IslamicData, StudySession, Subject, User } from './models/index.js';

export const dashboardRouter = Router();
dashboardRouter.get('/dashboard', requireAccessToken, async (request, response) => {
  const user = await User.findById(request.userId).select('settings');
  if (!user) return response.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'This account was not found.' } });
  const settings = user.settings ?? {};
  const timezone = settings.timezone || 'UTC';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const today = dateParts.year + '-' + dateParts.month + '-' + dateParts.day;
  const [islamic, fitness, subjects, sessions] = await Promise.all([
    IslamicData.findOne({ user: request.userId }).select('data'),
    FitnessData.findOne({ user: request.userId }).select('waterLogs stepLogs mealLogs workouts'),
    Subject.find({ user: request.userId, archived: false }).select('name color items'),
    StudySession.find({ user: request.userId, date: today }).select('subject durationSec'),
  ]);
  const prayers = islamic?.data?.prayers?.[today] ?? [];
  const waterLogs = fitness?.waterLogs ?? [];
  const stepLogs = fitness?.stepLogs ?? [];
  const mealLogs = fitness?.mealLogs ?? [];
  const mealSlots = fitness?.mealSlots ?? [];
  const workouts = fitness?.workouts ?? [];
  const waterMl = waterLogs.filter((item) => item.date === today).reduce((sum, item) => sum + item.amountMl, 0);
  const steps = stepLogs.find((item) => item.date === today)?.steps ?? 0;
  const completedMeals = mealLogs.filter((item) => item.date === today && ['on_time', 'late'].includes(item.status)).length;
  const sessionMinutes = sessions.reduce((sum, session) => sum + session.durationSec, 0) / 60;
  const studyBySubject = subjects.map((subject) => ({
    id: String(subject._id), name: subject.name, color: subject.color,
    minutes: Math.round(sessions.filter((session) => String(session.subject) === String(subject._id)).reduce((sum, session) => sum + session.durationSec, 0) / 60),
  })).filter((subject) => subject.minutes > 0);
  return response.json({
    date: today,
    prayerCount: prayers.length,
    prayerNames: prayers,
    studyMinutes: Math.round(sessionMinutes),
    studyTargetMinutes: settings.studyDailyTargetMin ?? 180,
    studyBySubject,
    waterMl,
    waterGoalMl: settings.waterGoalMl ?? 2500,
    steps,
    stepsTarget: settings.stepsTarget ?? 10000,
    completedMeals,
    mealCount: mealSlots.length ? mealSlots.filter((slot) => slot.enabled).length : 4,
    workoutDone: workouts.some((item) => item.date === today),
  });
});
