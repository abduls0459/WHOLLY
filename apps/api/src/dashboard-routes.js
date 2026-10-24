import { Router } from 'express';
import { requireAccessToken } from './auth.js';
import { FitnessData, IslamicData, StudySession, Subject, User } from './models/index.js';

export const dashboardRouter = Router();
dashboardRouter.get('/dashboard', requireAccessToken, async (request, response) => {
  const user = await User.findById(request.userId).select('settings');
  if (!user) return response.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'This account was not found.' } });
  const timezone = user.settings.timezone || 'UTC';
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
  const waterMl = fitness?.waterLogs.filter((item) => item.date === today).reduce((sum, item) => sum + item.amountMl, 0) ?? 0;
  const steps = fitness?.stepLogs.find((item) => item.date === today)?.steps ?? 0;
  const completedMeals = fitness?.mealLogs.filter((item) => item.date === today && ['on_time', 'late'].includes(item.status)).length ?? 0;
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
    studyTargetMinutes: user.settings.studyDailyTargetMin,
    studyBySubject,
    waterMl,
    waterGoalMl: user.settings.waterGoalMl,
    steps,
    stepsTarget: user.settings.stepsTarget,
    completedMeals,
    mealCount: fitness?.mealSlots.filter((slot) => slot.enabled).length ?? 4,
    workoutDone: Boolean(fitness?.workouts.some((item) => item.date === today)),
  });
});
