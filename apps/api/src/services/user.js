const settingsKeys = new Set([
  'timezone', 'latitude', 'longitude', 'locationLabel', 'calcMethod', 'asrSchool',
  'fitnessGoal', 'heightCm', 'goalWeightKg', 'stepsTarget', 'waterGoalMl',
  'waterIntervalMin', 'wakeTime', 'sleepTime', 'walkingReminderTime',
  'studyDailyTargetMin', 'revisionBufferDays', 'theme', 'onboardingComplete',
]);

const publicSettingNames = {
  locationLabel: 'location_label', calcMethod: 'calc_method', asrSchool: 'asr_school',
  fitnessGoal: 'fitness_goal', heightCm: 'height_cm', goalWeightKg: 'goal_weight_kg',
  stepsTarget: 'steps_target', waterGoalMl: 'water_goal_ml', waterIntervalMin: 'water_interval_min',
  waterGoalCustom: 'water_goal_custom', wakeTime: 'wake_time', sleepTime: 'sleep_time',
  walkingReminderTime: 'walking_reminder_time', studyDailyTargetMin: 'study_daily_target_min',
  revisionBufferDays: 'revision_buffer_days', onboardingComplete: 'onboarding_complete',
};

export function publicSettings(settings) {
  return Object.fromEntries(Object.entries(settings).map(([key, value]) => [publicSettingNames[key] ?? key, value]));
}

export function publicUser(user) {
  return {
    id: String(user._id), name: user.name, email: user.email,
    ...publicSettings(user.settings.toObject()),
  };
}

export function settingsPatch(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const keys = Object.keys(input);
  if (!keys.length || keys.some((key) => !settingsKeys.has(key))) return null;
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === 'timezone' && (typeof value !== 'string' || !value.trim() || value.length > 80)) return null;
    if (key === 'timezone') {
      try { new Intl.DateTimeFormat('en', { timeZone: value }).format(); }
      catch { return null; }
    }
    if (['latitude', 'longitude', 'heightCm', 'goalWeightKg'].includes(key) && value !== null && (typeof value !== 'number' || !Number.isFinite(value))) return null;
    if (key === 'locationLabel' && value !== null && (typeof value !== 'string' || value.length > 120)) return null;
    if (['calcMethod', 'asrSchool', 'stepsTarget', 'waterGoalMl', 'waterIntervalMin', 'studyDailyTargetMin', 'revisionBufferDays'].includes(key) && (!Number.isInteger(value) || value < 0)) return null;
    const ranges = {
      latitude: [-90, 90], longitude: [-180, 180], heightCm: [80, 250], goalWeightKg: [20, 400],
      calcMethod: [0, 20], asrSchool: [0, 1], stepsTarget: [0, 100000], waterGoalMl: [50, 10000],
      waterIntervalMin: [30, 480], studyDailyTargetMin: [1, 1440], revisionBufferDays: [0, 365],
    };
    if (ranges[key] && value !== null && (value < ranges[key][0] || value > ranges[key][1])) return null;
    if (key === 'onboardingComplete' && typeof value !== 'boolean') return null;
    if (key === 'fitnessGoal' && !['fat_loss', 'bulking', 'maintain'].includes(value)) return null;
    if (key === 'theme' && !['light', 'dark', 'system'].includes(value)) return null;
    if (['wakeTime', 'sleepTime', 'walkingReminderTime'].includes(key) && (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value))) return null;
    result[key] = value;
  }
  return result;
}
