import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  timezone: { type: String, required: true, default: 'UTC', maxlength: 80 },
  latitude: { type: Number, min: -90, max: 90, default: null },
  longitude: { type: Number, min: -180, max: 180, default: null },
  locationLabel: { type: String, maxlength: 120, default: null },
  calcMethod: { type: Number, min: 0, max: 20, default: 1 },
  asrSchool: { type: Number, enum: [0, 1], default: 1 },
  fitnessGoal: { type: String, enum: ['fat_loss', 'bulking', 'maintain'], default: 'maintain' },
  heightCm: { type: Number, min: 80, max: 250, default: null },
  goalWeightKg: { type: Number, min: 20, max: 400, default: null },
  stepsTarget: { type: Number, min: 0, max: 100000, default: 10000 },
  waterGoalMl: { type: Number, min: 50, max: 10000, default: 2500 },
  waterGoalCustom: { type: Boolean, default: false },
  wakeTime: { type: String, default: '07:00' },
  sleepTime: { type: String, default: '23:00' },
  waterIntervalMin: { type: Number, min: 30, max: 480, default: 120 },
  walkingReminderTime: { type: String, default: '17:30' },
  studyDailyTargetMin: { type: Number, min: 1, max: 1440, default: 180 },
  revisionBufferDays: { type: Number, min: 0, max: 365, default: 0 },
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  onboardingComplete: { type: Boolean, default: false },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  settings: { type: settingsSchema, default: () => ({}) },
}, { timestamps: true });

const refreshSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

const syllabusItemSchema = new mongoose.Schema({
  parentId: { type: mongoose.Schema.Types.ObjectId, default: null },
  itemType: { type: String, enum: ['unit', 'topic'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  estMinutes: { type: Number, min: 0, max: 100000, default: 120 },
  isDone: { type: Boolean, default: false },
  doneAt: { type: Date, default: null },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

const subjectSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  color: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: '#82977c' },
  examDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/, default: null },
  archived: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
  items: { type: [syllabusItemSchema], default: [] },
});
subjectSchema.index({ user: 1, sortOrder: 1, createdAt: 1 });

const studySessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  startedAt: { type: Date, required: true },
  endedAt: { type: Date, required: true },
  durationSec: { type: Number, required: true, min: 1 },
  source: { type: String, enum: ['timer', 'manual'], required: true },
  note: { type: String, maxlength: 500, default: null },
});
studySessionSchema.index({ user: 1, date: 1, startedAt: -1 });

const studyTimerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  startedAt: { type: Date, required: true },
  activeSince: { type: Date, default: null },
  pausedAt: { type: Date, default: null },
  segments: { type: [{ start: Date, end: Date }], default: [] },
});

const fitnessDataSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  waterLogs: { type: [{ date: String, loggedAt: { type: Date, default: Date.now }, amountMl: { type: Number, min: 50, max: 2000, required: true } }], default: [] },
  stepLogs: { type: [{ date: String, steps: { type: Number, min: 0, max: 100000, required: true } }], default: [] },
  bodyLogs: { type: [{ date: String, weightKg: { type: Number, min: 20, max: 400, required: true }, waistCm: Number, chestCm: Number, hipsCm: Number, bicepsCm: Number, thighCm: Number }], default: [] },
  mealSlots: { type: [{ name: { type: String, required: true, maxlength: 80 }, timeLocal: { type: String, required: true }, enabled: { type: Boolean, default: true }, sortOrder: { type: Number, default: 0 } }], default: [] },
  mealLogs: { type: [{ slotId: String, date: String, status: { type: String, enum: ['pending', 'on_time', 'late', 'skipped'] }, loggedAt: Date }], default: [] },
  workouts: { type: [{ date: String, title: { type: String, maxlength: 120 }, note: { type: String, maxlength: 500 }, exercises: [{ name: { type: String, required: true, maxlength: 100 }, sets: [{ reps: { type: Number, min: 1, max: 1000, required: true }, weightKg: { type: Number, min: 0, max: 1000, default: null } }] }] }], default: [] },
  workoutWeekdays: { type: [Number], default: [] },
});

const islamicDataSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  data: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const RefreshSession = mongoose.models.RefreshSession || mongoose.model('RefreshSession', refreshSessionSchema);
export const Subject = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);
export const StudySession = mongoose.models.StudySession || mongoose.model('StudySession', studySessionSchema);
export const StudyTimer = mongoose.models.StudyTimer || mongoose.model('StudyTimer', studyTimerSchema);
export const FitnessData = mongoose.models.FitnessData || mongoose.model('FitnessData', fitnessDataSchema);
export const IslamicData = mongoose.models.IslamicData || mongoose.model('IslamicData', islamicDataSchema);

