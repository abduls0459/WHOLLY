import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDown, Check, Copy, Dumbbell, Footprints, Pencil, Plus, Save, Trash2, Undo2, Waves } from "lucide-react";
import { fitnessRequest, updateSettings } from "./lib/api";
import "./fitness.css";
const metricNames = { weight_kg: "Weight", waist_cm: "Waist", chest_cm: "Chest", hips_cm: "Hips", biceps_cm: "Biceps", thigh_cm: "Thigh" };
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const todayString = (timezone) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(/* @__PURE__ */ new Date());
const emptyWorkout = (date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)) => ({ date, title: "", note: "", exercises: [{ name: "", sets: [{ reps: 10, weightKg: null }] }] });
async function call(path, method = "GET", body) {
  return fitnessRequest(path, { method, ...body === void 0 ? {} : { body: JSON.stringify(body) } });
}
function FitnessSection({ profile, onProfileChange }) {
  const today = todayString(profile.timezone || "UTC");
  const [tab, setTab] = useState("Today");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [water, setWater] = useState({ entries: [], totalMl: 0, goalMl: 2500 });
  const [customWater, setCustomWater] = useState(250);
  const [steps, setSteps] = useState(0);
  const [slots, setSlots] = useState([]);
  const [newSlot, setNewSlot] = useState({ name: "", time: "12:00" });
  const [schedule, setSchedule] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [exerciseNames, setExerciseNames] = useState([]);
  const [draft, setDraft] = useState(emptyWorkout(today));
  const [editingWorkout, setEditingWorkout] = useState("");
  const [bodyEntries, setBodyEntries] = useState([]);
  const [bodyDraft, setBodyDraft] = useState({ date: today, weightKg: "", waistCm: "", chestCm: "", hipsCm: "", bicepsCm: "", thighCm: "" });
  const [waterGoalEdited, setWaterGoalEdited] = useState(false);
  const [range, setRange] = useState("3m");
  const [metric, setMetric] = useState("weight_kg");
  const [settings, setSettings] = useState({ goal: profile.fitness_goal, waterGoal: profile.water_goal_ml ?? 2500, stepsTarget: profile.steps_target ?? 1e4, wake: (profile.wake_time ?? "07:00").slice(0, 5), sleep: (profile.sleep_time ?? "23:00").slice(0, 5), waterInterval: profile.water_interval_min ?? 120, walkingTime: (profile.walking_reminder_time ?? "17:30").slice(0, 5), goalWeight: profile.goal_weight_kg?.toString() ?? "" });
  async function loadToday() {
    const [waterData, stepData, mealData, scheduleData] = await Promise.all([
      call(`/fitness/water?date=${today}`),
      call(`/fitness/steps/${today}`),
      call(`/fitness/meals?date=${today}`),
      call("/fitness/schedule")
    ]);
    setWater(waterData);
    setSettings((current) => ({ ...current, waterGoal: waterData.goalMl }));
    setSteps(stepData.steps);
    setSlots(mealData.slots);
    setSchedule(scheduleData.days);
  }
  async function loadWorkouts() {
    const result = await call("/fitness/workouts");
    setWorkouts(result.workouts);
    setExerciseNames(result.exerciseNames);
  }
  async function loadBody() {
    const result = await call("/fitness/body");
    setBodyEntries(result.entries);
  }
  useEffect(() => {
    let current = true;
    Promise.all([loadToday(), loadWorkouts(), loadBody()]).catch((cause) => {
      if (current) setError(cause instanceof Error ? cause.message : "Could not load fitness data.");
    }).finally(() => {
      if (current) setLoading(false);
    });
    return () => {
      current = false;
    };
  }, []);
  async function save(operation) {
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this change.");
    } finally {
      setBusy(false);
    }
  }
  async function addWater(amountMl) {
    await save(async () => {
      await call("/fitness/water", "POST", { amountMl });
      await loadToday();
    });
  }
  async function saveSteps(event) {
    event.preventDefault();
    await save(async () => {
      await call(`/fitness/steps/${today}`, "PUT", { steps });
      await loadToday();
    });
  }
  async function setMeal(slot, status) {
    await save(async () => {
      await call(`/fitness/meals/${slot.id}`, "PATCH", { date: today, status });
      await loadToday();
    });
  }
  async function togglePlan(day) {
    const weekdays = schedule.filter((item) => item.isWorkoutDay).map((item) => item.weekday);
    const next = day.isWorkoutDay ? weekdays.filter((weekday) => weekday !== day.weekday) : [...weekdays, day.weekday];
    await save(async () => {
      await call("/fitness/schedule", "PUT", { weekdays: next });
      await loadToday();
    });
  }
  async function saveFitnessSettings() {
    await save(async () => {
      const response = await updateSettings({
        fitnessGoal: settings.goal,
        ...waterGoalEdited ? { waterGoalMl: Number(settings.waterGoal) } : {},
        stepsTarget: Number(settings.stepsTarget),
        wakeTime: settings.wake,
        sleepTime: settings.sleep,
        waterIntervalMin: Number(settings.waterInterval),
        walkingReminderTime: settings.walkingTime,
        goalWeightKg: settings.goalWeight ? Number(settings.goalWeight) : null
      });
      onProfileChange?.({ ...profile, ...response.settings });
      setWaterGoalEdited(false);
      await loadToday();
    });
  }
  function updateExercise(index, changes) {
    setDraft((current) => ({ ...current, exercises: current.exercises.map((exercise, i) => i === index ? { ...exercise, ...changes } : exercise) }));
  }
  async function saveWorkout(event) {
    event.preventDefault();
    await save(async () => {
      const path = editingWorkout ? `/fitness/workouts/${editingWorkout}` : "/fitness/workouts";
      await call(path, editingWorkout ? "PATCH" : "POST", draft);
      setDraft(emptyWorkout(today));
      setEditingWorkout("");
      await Promise.all([loadWorkouts(), loadToday()]);
    });
  }
  async function editWorkout(workout) {
    setEditingWorkout(workout.id);
    setDraft({ date: workout.date, title: workout.title ?? "", note: workout.note ?? "", exercises: workout.exercises.map((exercise) => ({ ...exercise, sets: exercise.sets.map((set) => ({ ...set })) })) });
    setTab("Workouts");
  }
  async function copyWorkout(workout) {
    await save(async () => {
      await call(`/fitness/workouts/${workout.id}/copy`, "POST");
      await Promise.all([loadWorkouts(), loadToday()]);
    });
  }
  async function deleteWorkout(workout) {
    if (!window.confirm("Delete this workout?")) return;
    await save(async () => {
      await call(`/fitness/workouts/${workout.id}`, "DELETE");
      await Promise.all([loadWorkouts(), loadToday()]);
    });
  }
  async function saveBody(event) {
    event.preventDefault();
    await save(async () => {
      await call("/fitness/body", "PUT", {
        date: bodyDraft.date,
        weightKg: Number(bodyDraft.weightKg),
        waistCm: bodyDraft.waistCm ? Number(bodyDraft.waistCm) : null,
        chestCm: bodyDraft.chestCm ? Number(bodyDraft.chestCm) : null,
        hipsCm: bodyDraft.hipsCm ? Number(bodyDraft.hipsCm) : null,
        bicepsCm: bodyDraft.bicepsCm ? Number(bodyDraft.bicepsCm) : null,
        thighCm: bodyDraft.thighCm ? Number(bodyDraft.thighCm) : null
      });
      setBodyDraft({ date: today, weightKg: "", waistCm: "", chestCm: "", hipsCm: "", bicepsCm: "", thighCm: "" });
      await loadBody();
    });
  }
  const filteredBody = useMemo(() => {
    if (range === "all") return bodyEntries;
    const cutoff = /* @__PURE__ */ new Date(`${today}T00:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - (range === "1m" ? 30 : 90));
    return bodyEntries.filter((entry) => entry.date >= cutoff.toISOString().slice(0, 10));
  }, [bodyEntries, range, today]);
  const currentBody = bodyEntries.at(-1);
  function changeFrom(days) {
    if (!currentBody) return null;
    const cutoff = /* @__PURE__ */ new Date(`${today}T00:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    const previous = [...bodyEntries].reverse().find((entry) => entry.date <= cutoff.toISOString().slice(0, 10));
    return previous ? Number(currentBody.weight_kg) - Number(previous.weight_kg) : null;
  }
  const daysDoneOnTime = slots.filter((slot) => slot.enabled && slot.status === "on_time").length;
  const enabledMeals = slots.filter((slot) => slot.enabled).length;
  const latestFirst = water.entries;
  const workoutDone = schedule.some((day) => day.date === today && day.status === "workout_done");
  return /* @__PURE__ */ jsxs("section", { className: "fitness-page", children: [
    /* @__PURE__ */ jsxs("div", { className: "fitness-heading", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "fitness-eyebrow", children: "CARE FOR YOUR BODY" }),
        /* @__PURE__ */ jsx("h1", { children: "Fitness" }),
        /* @__PURE__ */ jsx("p", { children: "Small, steady habits add up." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "fitness-goal-summary", children: [
        /* @__PURE__ */ jsx("span", { children: "Your goal" }),
        /* @__PURE__ */ jsx("strong", { children: settings.goal.replace("_", " ") })
      ] })
    ] }),
    /* @__PURE__ */ jsx("nav", { className: "fitness-tabs", "aria-label": "Fitness sections", children: ["Today", "Workouts", "Body"].map((item) => /* @__PURE__ */ jsx("button", { className: tab === item ? "selected" : "", onClick: () => setTab(item), children: item }, item)) }),
    error && /* @__PURE__ */ jsx("p", { className: "fitness-error", role: "alert", children: error }),
    loading ? /* @__PURE__ */ jsx("div", { className: "fitness-loading", children: "Loading your fitness space\u2026" }) : tab === "Today" ? /* @__PURE__ */ jsxs("div", { className: "fitness-today", children: [
      /* @__PURE__ */ jsxs("div", { className: `fitness-today-grid ${settings.goal === "bulking" ? "bulking" : ""}`, children: [
        /* @__PURE__ */ jsxs("article", { className: "fitness-panel fitness-water-panel", children: [
          /* @__PURE__ */ jsxs("div", { className: "fitness-panel-title", children: [
            /* @__PURE__ */ jsx("span", { className: "fitness-icon water", children: /* @__PURE__ */ jsx(Waves, { size: 18 }) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("span", { className: "fitness-kicker", children: "WATER" }),
              /* @__PURE__ */ jsx("h2", { children: "Stay hydrated" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "fitness-water-count", children: [
            /* @__PURE__ */ jsx("strong", { children: water.totalMl.toLocaleString() }),
            /* @__PURE__ */ jsxs("span", { children: [
              "of ",
              water.goalMl.toLocaleString(),
              " ml"
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "fitness-progress", "aria-label": `${Math.min(100, Math.round(water.totalMl / water.goalMl * 100))}% of water target`, children: /* @__PURE__ */ jsx("i", { style: { width: `${Math.min(100, water.totalMl / water.goalMl * 100)}%` } }) }),
          /* @__PURE__ */ jsxs("div", { className: "fitness-water-actions", children: [
            /* @__PURE__ */ jsx("button", { onClick: () => void addWater(250), disabled: busy, children: "+250 ml" }),
            /* @__PURE__ */ jsx("button", { onClick: () => void addWater(500), disabled: busy, children: "+500 ml" }),
            /* @__PURE__ */ jsxs("form", { onSubmit: (event) => {
              event.preventDefault();
              void addWater(customWater);
            }, children: [
              /* @__PURE__ */ jsx("input", { "aria-label": "Custom water amount in milliliters", type: "number", min: "50", max: "2000", step: "50", value: customWater, onChange: (event) => setCustomWater(Number(event.target.value)) }),
              /* @__PURE__ */ jsx("button", { disabled: busy, children: "Add" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "fitness-water-log", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("strong", { children: "Today\u2019s entries" }),
              /* @__PURE__ */ jsxs("button", { className: "fitness-text-button", disabled: !water.entries.length || busy, onClick: () => void save(async () => {
                await call("/fitness/water", "DELETE");
                await loadToday();
              }), children: [
                /* @__PURE__ */ jsx(Undo2, { size: 13 }),
                " Undo last"
              ] })
            ] }),
            latestFirst.length ? latestFirst.slice(0, 5).map((entry) => /* @__PURE__ */ jsxs("p", { children: [
              /* @__PURE__ */ jsx("span", { children: new Date(entry.logged_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) }),
              /* @__PURE__ */ jsxs("strong", { children: [
                entry.amount_ml,
                " ml"
              ] })
            ] }, entry.id)) : /* @__PURE__ */ jsx("small", { children: "No water logged today." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("article", { className: "fitness-panel fitness-meal-panel", children: [
          /* @__PURE__ */ jsxs("div", { className: "fitness-panel-title", children: [
            /* @__PURE__ */ jsx("span", { className: "fitness-icon meal", children: /* @__PURE__ */ jsx(Activity, { size: 18 }) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("span", { className: "fitness-kicker", children: "MEALS" }),
              /* @__PURE__ */ jsx("h2", { children: "How did you eat today?" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "fitness-meal-summary", children: [
            daysDoneOnTime,
            " of ",
            enabledMeals,
            " on time"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "fitness-meal-list", children: slots.filter((slot) => slot.enabled).map((slot) => /* @__PURE__ */ jsxs("div", { className: "fitness-meal-row", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("strong", { children: slot.name }),
              /* @__PURE__ */ jsxs("span", { children: [
                slot.time_local.slice(0, 5),
                " \xB7 ",
                /* @__PURE__ */ jsx("em", { className: `meal-status ${slot.status}`, children: slot.status.replace("_", " ") })
              ] })
            ] }),
            slot.status === "pending" ? /* @__PURE__ */ jsxs("div", { className: "fitness-meal-actions", children: [
              /* @__PURE__ */ jsx("button", { "aria-label": `Mark ${slot.name} eaten`, onClick: () => void setMeal(slot, "eaten"), disabled: busy, children: /* @__PURE__ */ jsx(Check, { size: 15 }) }),
              /* @__PURE__ */ jsx("button", { "aria-label": `Skip ${slot.name}`, onClick: () => void setMeal(slot, "skipped"), disabled: busy, children: "Skip" })
            ] }) : /* @__PURE__ */ jsx(Check, { className: "fitness-meal-done", size: 17 })
          ] }, slot.id)) }),
          /* @__PURE__ */ jsxs("details", { className: "fitness-slot-settings", children: [
            /* @__PURE__ */ jsx("summary", { children: "Edit meal slots" }),
            slots.map((slot) => /* @__PURE__ */ jsxs("form", { onSubmit: (event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              void save(async () => {
                await call(`/fitness/meals/slots/${slot.id}`, "PATCH", { name: values.get("name"), time: values.get("time"), enabled: values.get("enabled") === "on" });
                await loadToday();
              });
            }, children: [
              /* @__PURE__ */ jsx("input", { "aria-label": `${slot.name} name`, name: "name", maxLength: 80, defaultValue: slot.name, required: true }),
              /* @__PURE__ */ jsx("input", { "aria-label": `${slot.name} time`, name: "time", type: "time", defaultValue: slot.time_local.slice(0, 5), required: true }),
              /* @__PURE__ */ jsxs("label", { children: [
                /* @__PURE__ */ jsx("input", { name: "enabled", type: "checkbox", defaultChecked: slot.enabled }),
                " Enabled"
              ] }),
              /* @__PURE__ */ jsx("button", { "aria-label": `Save ${slot.name} settings`, disabled: busy, children: /* @__PURE__ */ jsx(Save, { size: 13 }) }),
              /* @__PURE__ */ jsx("button", { type: "button", "aria-label": `Delete ${slot.name}`, disabled: busy, onClick: () => void save(async () => {
                await call(`/fitness/meals/slots/${slot.id}`, "DELETE");
                await loadToday();
              }), children: /* @__PURE__ */ jsx(Trash2, { size: 13 }) })
            ] }, slot.id)),
            /* @__PURE__ */ jsxs("form", { className: "fitness-new-slot", onSubmit: (event) => {
              event.preventDefault();
              void save(async () => {
                await call("/fitness/meals/slots", "POST", newSlot);
                setNewSlot({ name: "", time: "12:00" });
                await loadToday();
              });
            }, children: [
              /* @__PURE__ */ jsx("input", { "aria-label": "New meal name", placeholder: "Meal name", maxLength: 80, required: true, value: newSlot.name, onChange: (event) => setNewSlot((value) => ({ ...value, name: event.target.value })) }),
              /* @__PURE__ */ jsx("input", { "aria-label": "New meal time", type: "time", required: true, value: newSlot.time, onChange: (event) => setNewSlot((value) => ({ ...value, time: event.target.value })) }),
              /* @__PURE__ */ jsxs("button", { className: "fitness-text-button", disabled: busy, children: [
                /* @__PURE__ */ jsx(Plus, { size: 13 }),
                " Add meal slot"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "fitness-small-note", children: "Meal reminders are not active in this app yet." })
        ] }),
        /* @__PURE__ */ jsxs("article", { className: "fitness-panel fitness-steps-panel", children: [
          /* @__PURE__ */ jsxs("div", { className: "fitness-panel-title", children: [
            /* @__PURE__ */ jsx("span", { className: "fitness-icon steps", children: /* @__PURE__ */ jsx(Footprints, { size: 18 }) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("span", { className: "fitness-kicker", children: "STEPS" }),
              /* @__PURE__ */ jsx("h2", { children: "Today\u2019s movement" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "fitness-step-count", children: [
            /* @__PURE__ */ jsx("strong", { children: steps.toLocaleString() }),
            /* @__PURE__ */ jsxs("span", { children: [
              "of ",
              settings.stepsTarget.toLocaleString(),
              " steps"
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "fitness-progress", children: /* @__PURE__ */ jsx("i", { style: { width: `${Math.min(100, steps / Math.max(settings.stepsTarget, 1) * 100)}%` } }) }),
          /* @__PURE__ */ jsxs("form", { className: "fitness-step-form", onSubmit: saveSteps, children: [
            /* @__PURE__ */ jsx("input", { "aria-label": "Steps today", type: "number", min: "0", max: "100000", step: "1", value: steps, onChange: (event) => setSteps(Number(event.target.value)) }),
            /* @__PURE__ */ jsxs("button", { disabled: busy, children: [
              /* @__PURE__ */ jsx(Save, { size: 14 }),
              " Save"
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "fitness-small-note", children: "Steps are entered manually." })
        ] }),
        /* @__PURE__ */ jsxs("article", { className: "fitness-panel fitness-week-panel", children: [
          /* @__PURE__ */ jsxs("div", { className: "fitness-panel-title", children: [
            /* @__PURE__ */ jsx("span", { className: "fitness-icon workout", children: /* @__PURE__ */ jsx(Dumbbell, { size: 18 }) }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("span", { className: "fitness-kicker", children: "WEEKLY PLAN" }),
              /* @__PURE__ */ jsx("h2", { children: "Workout and rest days" })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "fitness-week-strip", children: schedule.map((day) => /* @__PURE__ */ jsxs("div", { className: `fitness-week-day ${day.status}`, children: [
            /* @__PURE__ */ jsx("strong", { children: dayNames[day.weekday] }),
            /* @__PURE__ */ jsx("span", { children: Number(day.date.slice(-2)) }),
            /* @__PURE__ */ jsx("small", { children: day.status === "workout_done" ? "Done" : day.status === "not_done" ? "Not done" : day.status === "planned" ? "Planned" : "Rest" }),
            /* @__PURE__ */ jsx("button", { "aria-label": `${day.isWorkoutDay ? "Set" : "Plan"} ${dayNames[day.weekday]} as ${day.isWorkoutDay ? "rest" : "workout"} day`, onClick: () => void togglePlan(day), disabled: busy || day.date < today && day.status === "workout_done", children: day.isWorkoutDay ? "Workout" : "Rest" })
          ] }, day.date)) }),
          /* @__PURE__ */ jsxs("div", { className: "fitness-today-workout", children: [
            /* @__PURE__ */ jsx("span", { className: workoutDone ? "workout-pill done" : "workout-pill", children: workoutDone ? "Workout done today" : "Recovery is part of the plan" }),
            /* @__PURE__ */ jsxs("button", { onClick: () => {
              setTab("Workouts");
              setDraft(emptyWorkout(today));
              setEditingWorkout("");
            }, children: [
              workoutDone ? "Log another" : "Log workout",
              " ",
              /* @__PURE__ */ jsx(ArrowDown, { size: 13 })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("details", { className: "fitness-panel fitness-settings", children: [
        /* @__PURE__ */ jsx("summary", { children: "Fitness goals and preferences" }),
        /* @__PURE__ */ jsxs("div", { className: "fitness-settings-grid", children: [
          /* @__PURE__ */ jsxs("label", { children: [
            "Fitness goal",
            /* @__PURE__ */ jsxs("select", { value: settings.goal, onChange: (event) => setSettings((value) => ({ ...value, goal: event.target.value })), children: [
              /* @__PURE__ */ jsx("option", { value: "fat_loss", children: "Fat loss" }),
              /* @__PURE__ */ jsx("option", { value: "bulking", children: "Bulking" }),
              /* @__PURE__ */ jsx("option", { value: "maintain", children: "Maintain" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("label", { children: [
            "Daily water goal (ml)",
            /* @__PURE__ */ jsx("input", { type: "number", min: "50", max: "10000", step: "50", value: settings.waterGoal, onChange: (event) => {
              setWaterGoalEdited(true);
              setSettings((value) => ({ ...value, waterGoal: Number(event.target.value) }));
            } })
          ] }),
          /* @__PURE__ */ jsxs("label", { children: [
            "Steps target",
            /* @__PURE__ */ jsx("input", { type: "number", min: "0", max: "100000", step: "500", value: settings.stepsTarget, onChange: (event) => setSettings((value) => ({ ...value, stepsTarget: Number(event.target.value) })) })
          ] }),
          /* @__PURE__ */ jsxs("label", { children: [
            "Goal weight (kg)",
            /* @__PURE__ */ jsx("input", { type: "number", min: "20", max: "400", step: "0.1", placeholder: "Optional", value: settings.goalWeight, onChange: (event) => setSettings((value) => ({ ...value, goalWeight: event.target.value })) })
          ] }),
          /* @__PURE__ */ jsxs("label", { children: [
            "Wake time",
            /* @__PURE__ */ jsx("input", { type: "time", value: settings.wake, onChange: (event) => setSettings((value) => ({ ...value, wake: event.target.value })) })
          ] }),
          /* @__PURE__ */ jsxs("label", { children: [
            "Sleep time",
            /* @__PURE__ */ jsx("input", { type: "time", value: settings.sleep, onChange: (event) => setSettings((value) => ({ ...value, sleep: event.target.value })) })
          ] }),
          /* @__PURE__ */ jsxs("label", { children: [
            "Water reminder interval (min)",
            /* @__PURE__ */ jsx("input", { type: "number", min: "30", max: "480", step: "30", value: settings.waterInterval, onChange: (event) => setSettings((value) => ({ ...value, waterInterval: Number(event.target.value) })) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "fitness-walk-time", children: [
          "Walking reminder time",
          /* @__PURE__ */ jsx("input", { type: "time", value: settings.walkingTime, onChange: (event) => setSettings((value) => ({ ...value, walkingTime: event.target.value })) })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "fitness-small-note", children: "These preferences are saved to your account. Scheduled reminders are not active yet." }),
        /* @__PURE__ */ jsx("button", { className: "fitness-primary", onClick: () => void saveFitnessSettings(), disabled: busy, children: "Save preferences" })
      ] })
    ] }) : tab === "Workouts" ? /* @__PURE__ */ jsxs("div", { className: "fitness-workouts-view", children: [
      /* @__PURE__ */ jsxs("div", { className: "fitness-view-heading", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "fitness-kicker", children: "WORKOUT HISTORY" }),
          /* @__PURE__ */ jsx("h2", { children: "Move at your pace" })
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "fitness-primary", onClick: () => {
          setDraft(emptyWorkout());
          setEditingWorkout("");
        }, children: [
          /* @__PURE__ */ jsx(Plus, { size: 15 }),
          " New workout"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("form", { className: "fitness-panel fitness-workout-form", onSubmit: saveWorkout, children: [
        /* @__PURE__ */ jsxs("div", { className: "fitness-form-head", children: [
          /* @__PURE__ */ jsx("h3", { children: editingWorkout ? "Edit workout" : "Log a workout" }),
          /* @__PURE__ */ jsxs("label", { children: [
            "Date",
            /* @__PURE__ */ jsx("input", { required: true, type: "date", max: today, value: draft.date, onChange: (event) => setDraft((value) => ({ ...value, date: event.target.value })) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "fitness-wide-label", children: [
          "Title (optional)",
          /* @__PURE__ */ jsx("input", { maxLength: 120, placeholder: "e.g. Upper body", value: draft.title ?? "", onChange: (event) => setDraft((value) => ({ ...value, title: event.target.value })) })
        ] }),
        draft.exercises.map((exercise, index) => /* @__PURE__ */ jsxs("div", { className: "fitness-exercise", children: [
          /* @__PURE__ */ jsxs("div", { className: "fitness-exercise-head", children: [
            /* @__PURE__ */ jsxs("label", { children: [
              "Exercise",
              /* @__PURE__ */ jsx("input", { list: "fitness-exercise-names", required: true, maxLength: 100, value: exercise.name, onChange: (event) => updateExercise(index, { name: event.target.value }), placeholder: "e.g. Squat" })
            ] }),
            /* @__PURE__ */ jsx("datalist", { id: "fitness-exercise-names", children: exerciseNames.map((name) => /* @__PURE__ */ jsx("option", { value: name }, name)) }),
            /* @__PURE__ */ jsx("button", { type: "button", className: "fitness-icon-button", "aria-label": "Remove exercise", onClick: () => setDraft((value) => ({ ...value, exercises: value.exercises.filter((_, i) => i !== index) })), disabled: draft.exercises.length <= 1, children: /* @__PURE__ */ jsx(Trash2, { size: 15 }) })
          ] }),
          exercise.sets.map((set, setIndex) => /* @__PURE__ */ jsxs("div", { className: "fitness-set-row", children: [
            /* @__PURE__ */ jsxs("span", { children: [
              "Set ",
              setIndex + 1
            ] }),
            /* @__PURE__ */ jsxs("label", { children: [
              "Reps",
              /* @__PURE__ */ jsx("input", { type: "number", min: "1", max: "1000", value: set.reps, onChange: (event) => updateExercise(index, { sets: exercise.sets.map((item, i) => i === setIndex ? { ...item, reps: Number(event.target.value) } : item) }) })
            ] }),
            /* @__PURE__ */ jsxs("label", { children: [
              "Weight kg",
              /* @__PURE__ */ jsx("input", { type: "number", min: "0.1", step: "0.1", placeholder: "\u2014", value: set.weightKg ?? "", onChange: (event) => updateExercise(index, { sets: exercise.sets.map((item, i) => i === setIndex ? { ...item, weightKg: event.target.value ? Number(event.target.value) : null } : item) }) })
            ] }),
            /* @__PURE__ */ jsx("button", { type: "button", className: "fitness-icon-button", "aria-label": `Remove set ${setIndex + 1}`, disabled: exercise.sets.length <= 1, onClick: () => updateExercise(index, { sets: exercise.sets.filter((_, i) => i !== setIndex) }), children: /* @__PURE__ */ jsx(Trash2, { size: 13 }) })
          ] }, setIndex)),
          /* @__PURE__ */ jsxs("button", { type: "button", className: "fitness-text-button", disabled: exercise.sets.length >= 20, onClick: () => updateExercise(index, { sets: [...exercise.sets, { reps: 10, weightKg: null }] }), children: [
            /* @__PURE__ */ jsx(Plus, { size: 13 }),
            " Add set"
          ] })
        ] }, index)),
        /* @__PURE__ */ jsxs("button", { type: "button", className: "fitness-secondary", disabled: draft.exercises.length >= 30, onClick: () => setDraft((value) => ({ ...value, exercises: [...value.exercises, { name: "", sets: [{ reps: 10, weightKg: null }] }] })), children: [
          /* @__PURE__ */ jsx(Plus, { size: 14 }),
          " Add exercise"
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "fitness-wide-label", children: [
          "Note",
          /* @__PURE__ */ jsx("textarea", { maxLength: 500, value: draft.note ?? "", onChange: (event) => setDraft((value) => ({ ...value, note: event.target.value })) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "fitness-form-actions", children: [
          /* @__PURE__ */ jsx("button", { className: "fitness-primary", disabled: busy, children: editingWorkout ? "Save workout" : "Save workout" }),
          editingWorkout && /* @__PURE__ */ jsx("button", { type: "button", className: "fitness-secondary", onClick: () => {
            setEditingWorkout("");
            setDraft(emptyWorkout());
          }, children: "Cancel" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "fitness-history", children: [
        /* @__PURE__ */ jsx("h3", { children: "Recent workouts" }),
        workouts.length ? workouts.map((workout) => /* @__PURE__ */ jsxs("article", { className: "fitness-panel fitness-workout-card", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "fitness-kicker", children: (/* @__PURE__ */ new Date(`${workout.date}T12:00:00Z`)).toLocaleDateString(void 0, { weekday: "long", month: "short", day: "numeric" }) }),
            /* @__PURE__ */ jsx("h3", { children: workout.title || workout.exercises.map((exercise) => exercise.name).join(", ") }),
            /* @__PURE__ */ jsx("p", { children: workout.exercises.map((exercise) => `${exercise.name} \xB7 ${exercise.sets.length} sets`).join(" / ") })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "fitness-workout-actions", children: [
            /* @__PURE__ */ jsx("button", { "aria-label": "Edit workout", onClick: () => void editWorkout(workout), children: /* @__PURE__ */ jsx(Pencil, { size: 14 }) }),
            /* @__PURE__ */ jsx("button", { "aria-label": "Copy workout to today", onClick: () => void copyWorkout(workout), children: /* @__PURE__ */ jsx(Copy, { size: 14 }) }),
            /* @__PURE__ */ jsx("button", { "aria-label": "Delete workout", onClick: () => void deleteWorkout(workout), children: /* @__PURE__ */ jsx(Trash2, { size: 14 }) })
          ] })
        ] }, workout.id)) : /* @__PURE__ */ jsx("div", { className: "fitness-empty", children: "No workouts logged yet." })
      ] })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "fitness-body-view", children: [
      /* @__PURE__ */ jsxs("div", { className: "fitness-view-heading", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "fitness-kicker", children: "BODY MEASUREMENTS" }),
          /* @__PURE__ */ jsx("h2", { children: "See your progress over time" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "fitness-range-switch", children: ["1m", "3m", "all"].map((value) => /* @__PURE__ */ jsx("button", { className: range === value ? "active" : "", onClick: () => setRange(value), children: value === "all" ? "All" : value.toUpperCase() }, value)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "fitness-summary-cards", children: [
        /* @__PURE__ */ jsxs("article", { children: [
          /* @__PURE__ */ jsx("span", { children: "Current" }),
          /* @__PURE__ */ jsx("strong", { children: currentBody ? `${Number(currentBody.weight_kg).toFixed(1)} kg` : "\u2014" })
        ] }),
        /* @__PURE__ */ jsxs("article", { children: [
          /* @__PURE__ */ jsx("span", { children: "Change in 7 days" }),
          /* @__PURE__ */ jsx("strong", { children: changeFrom(7) === null ? "\u2014" : `${changeFrom(7) > 0 ? "+" : ""}${changeFrom(7).toFixed(1)} kg` })
        ] }),
        /* @__PURE__ */ jsxs("article", { children: [
          /* @__PURE__ */ jsx("span", { children: "Change in 30 days" }),
          /* @__PURE__ */ jsx("strong", { children: changeFrom(30) === null ? "\u2014" : `${changeFrom(30) > 0 ? "+" : ""}${changeFrom(30).toFixed(1)} kg` })
        ] }),
        /* @__PURE__ */ jsxs("article", { children: [
          /* @__PURE__ */ jsx("span", { children: "To goal weight" }),
          /* @__PURE__ */ jsx("strong", { children: currentBody && settings.goalWeight ? `${(Number(settings.goalWeight) - Number(currentBody.weight_kg)).toFixed(1)} kg` : "\u2014" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("article", { className: "fitness-panel fitness-chart-panel", children: [
        /* @__PURE__ */ jsxs("div", { className: "fitness-chart-head", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { children: metricNames[metric] }),
            /* @__PURE__ */ jsx("span", { children: metric === "weight_kg" ? "Raw entries and 7-day moving average" : "Recorded measurements" })
          ] }),
          /* @__PURE__ */ jsx("select", { "aria-label": "Body chart measurement", value: metric, onChange: (event) => setMetric(event.target.value), children: Object.entries(metricNames).map(([key, name]) => /* @__PURE__ */ jsx("option", { value: key, children: name }, key)) })
        ] }),
        /* @__PURE__ */ jsx(BodyChart, { entries: filteredBody, metric, goalWeight: Number(settings.goalWeight) || null }),
        /* @__PURE__ */ jsxs("div", { className: "fitness-chart-legend", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx("i", {}),
            " ",
            metricNames[metric]
          ] }),
          metric === "weight_kg" && /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx("i", { className: "average" }),
            " 7-day average"
          ] }),
          metric === "weight_kg" && settings.goalWeight && /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx("i", { className: "goal" }),
            " Goal weight"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("form", { className: "fitness-panel fitness-body-form", onSubmit: saveBody, children: [
        /* @__PURE__ */ jsx("h3", { children: "Log body measurements" }),
        /* @__PURE__ */ jsxs("div", { className: "fitness-body-fields", children: [
          /* @__PURE__ */ jsxs("label", { children: [
            "Date",
            /* @__PURE__ */ jsx("input", { type: "date", max: today, required: true, value: bodyDraft.date, onChange: (event) => setBodyDraft((value) => ({ ...value, date: event.target.value })) })
          ] }),
          /* @__PURE__ */ jsxs("label", { children: [
            "Weight kg",
            /* @__PURE__ */ jsx("input", { type: "number", min: "20", max: "400", step: "0.1", required: true, value: bodyDraft.weightKg, onChange: (event) => setBodyDraft((value) => ({ ...value, weightKg: event.target.value })) })
          ] }),
          ["waistCm", "chestCm", "hipsCm", "bicepsCm", "thighCm"].map((field) => /* @__PURE__ */ jsxs("label", { children: [
            field.replace("Cm", " cm").replace(/^./, (letter) => letter.toUpperCase()),
            /* @__PURE__ */ jsx("input", { type: "number", min: "0.1", step: "0.1", value: bodyDraft[field], onChange: (event) => setBodyDraft((value) => ({ ...value, [field]: event.target.value })) })
          ] }, field))
        ] }),
        /* @__PURE__ */ jsx("button", { className: "fitness-primary", disabled: busy, children: "Save measurement" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "fitness-body-list", children: [
        /* @__PURE__ */ jsx("h3", { children: "Entries" }),
        [...bodyEntries].reverse().slice(0, 12).map((entry) => /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("strong", { children: (/* @__PURE__ */ new Date(`${entry.date}T12:00:00Z`)).toLocaleDateString(void 0, { month: "short", day: "numeric", year: "numeric" }) }),
          /* @__PURE__ */ jsxs("span", { children: [
            Number(entry.weight_kg).toFixed(1),
            " kg",
            entry.waist_cm ? ` \xB7 Waist ${entry.waist_cm} cm` : "",
            entry.chest_cm ? ` \xB7 Chest ${entry.chest_cm} cm` : "",
            entry.hips_cm ? ` \xB7 Hips ${entry.hips_cm} cm` : ""
          ] }),
          /* @__PURE__ */ jsx("button", { "aria-label": "Edit this day's measurements", onClick: () => setBodyDraft({ date: entry.date, weightKg: String(entry.weight_kg), waistCm: entry.waist_cm ? String(entry.waist_cm) : "", chestCm: entry.chest_cm ? String(entry.chest_cm) : "", hipsCm: entry.hips_cm ? String(entry.hips_cm) : "", bicepsCm: entry.biceps_cm ? String(entry.biceps_cm) : "", thighCm: entry.thigh_cm ? String(entry.thigh_cm) : "" }), children: /* @__PURE__ */ jsx(Pencil, { size: 13 }) })
        ] }, entry.date))
      ] })
    ] })
  ] });
}
function BodyChart({ entries, metric, goalWeight }) {
  const rows = entries.map((entry) => ({ date: entry.date, value: entry[metric] === null ? null : Number(entry[metric]) })).filter((entry) => entry.value !== null);
  if (!rows.length) return /* @__PURE__ */ jsx("div", { className: "fitness-chart-empty", children: "Log a measurement to start your chart." });
  const values = rows.map((row) => row.value).concat(metric === "weight_kg" && goalWeight ? [goalWeight] : []);
  const low = Math.min(...values) - (Math.max(...values) - Math.min(...values) || 1) * 0.15;
  const high = Math.max(...values) + (Math.max(...values) - Math.min(...values) || 1) * 0.15;
  const x = (index) => 28 + index * (644 / Math.max(1, rows.length - 1));
  const y = (value) => 182 - (value - low) / (high - low) * 150;
  const raw = rows.map((row, index) => `${x(index)},${y(row.value)}`).join(" ");
  const averages = rows.map((row, index) => {
    const current = (/* @__PURE__ */ new Date(`${row.date}T00:00:00Z`)).getTime();
    const recent = rows.filter((item) => current - (/* @__PURE__ */ new Date(`${item.date}T00:00:00Z`)).getTime() < 7 * 864e5 && current >= (/* @__PURE__ */ new Date(`${item.date}T00:00:00Z`)).getTime());
    return `${x(index)},${y(recent.reduce((sum, item) => sum + item.value, 0) / recent.length)}`;
  }).join(" ");
  return /* @__PURE__ */ jsx("div", { className: "fitness-svg-wrap", children: /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 700 220", role: "img", "aria-label": `${metricNames[metric]} measurements over time`, children: [
    /* @__PURE__ */ jsx("line", { x1: "28", y1: "182", x2: "672", y2: "182", className: "fitness-axis" }),
    /* @__PURE__ */ jsx("line", { x1: "28", y1: "30", x2: "28", y2: "182", className: "fitness-axis" }),
    goalWeight && metric === "weight_kg" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("line", { x1: "28", x2: "672", y1: y(goalWeight), y2: y(goalWeight), className: "fitness-goal-line" }),
      /* @__PURE__ */ jsx("text", { x: "670", y: y(goalWeight) - 5, textAnchor: "end", children: "Goal" })
    ] }),
    /* @__PURE__ */ jsx("polyline", { points: raw, className: "fitness-raw-line" }),
    metric === "weight_kg" && /* @__PURE__ */ jsx("polyline", { points: averages, className: "fitness-average-line" }),
    rows.map((row, index) => /* @__PURE__ */ jsxs("g", { children: [
      /* @__PURE__ */ jsx("circle", { cx: x(index), cy: y(row.value), r: "4", className: "fitness-point" }),
      /* @__PURE__ */ jsx("text", { x: x(index), y: "202", textAnchor: "middle", children: row.date.slice(5) })
    ] }, row.date))
  ] }) });
}
export {
  FitnessSection
};
