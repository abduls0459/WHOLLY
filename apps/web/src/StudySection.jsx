import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, CalendarDays, Check, Clock3, Pencil, Play, Plus, Square, Trash2 } from "lucide-react";
import { studyRequest, updateSettings } from "./lib/api";
import "./study.css";
function dateInZone(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function addDays(date, amount) {
  const value = /* @__PURE__ */ new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}
function mondayOf(date) {
  const value = /* @__PURE__ */ new Date(`${date}T12:00:00Z`);
  const weekday = (value.getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}
function minutesLabel(minutes) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours ? `${hours}h ${remaining}m` : `${remaining}m`;
}
function hoursLabel(minutes) {
  return `${(minutes / 60).toFixed(1)} h`;
}
async function send(path, method = "GET", body) {
  return studyRequest(path, { method, ...body ? { body: JSON.stringify(body) } : {} });
}
function StudySection({ profile }) {
  const timezone = profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const today = dateInZone(/* @__PURE__ */ new Date(), timezone);
  const [page, setPage] = useState("Subjects");
  const [subjects, setSubjects] = useState([]);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [timer, setTimer] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [planner, setPlanner] = useState(null);
  const [revisionBufferDays, setRevisionBufferDays] = useState(profile.revision_buffer_days ?? 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState({ name: "", color: "#82977c", examDate: "" });
  const [editingSubject, setEditingSubject] = useState("");
  const [editSubjectDraft, setEditSubjectDraft] = useState({ name: "", color: "#82977c", examDate: "" });
  const [newUnit, setNewUnit] = useState("");
  const [newTopic, setNewTopic] = useState({});
  const [newEstimate, setNewEstimate] = useState({});
  const [editingItem, setEditingItem] = useState("");
  const [editItemDraft, setEditItemDraft] = useState({ title: "", estMinutes: 120 });
  const [manualDraft, setManualDraft] = useState({ subjectId: "", date: today, minutes: 30, note: "" });
  const [editingSession, setEditingSession] = useState("");
  const [editSessionDraft, setEditSessionDraft] = useState({ subjectId: "", date: today, minutes: 30, note: "" });
  const [analyticsMode, setAnalyticsMode] = useState("week");
  const [periodOffset, setPeriodOffset] = useState(0);
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [analyticsRows, setAnalyticsRows] = useState([]);
  const activeSubject = subjects.find((subject) => subject.id === selectedSubjectId);
  const activeSubjects = subjects.filter((subject) => !subject.archived);
  const dailyMinutes = sessions.filter((session) => session.date === today).reduce((sum, session) => sum + session.duration_sec, 0) / 60;
  const dailyTarget = profile.study_daily_target_min ?? 180;
  async function loadSubjects(include = includeArchived) {
    const result = await send(`/subjects${include ? "?includeArchived=true" : ""}`);
    setSubjects(result.subjects);
  }
  async function loadTimer() {
    const result = await send("/study/timer");
    setTimer(result.timer);
    setElapsed(result.timer?.elapsed_sec ?? 0);
  }
  async function loadSessions() {
    const result = await send(`/study/sessions?from=${today}&to=${today}`);
    setSessions(result.sessions);
  }
  async function loadPlanner() {
    const result = await send("/study/planner");
    setPlanner(result);
    setRevisionBufferDays(result.revisionBufferDays);
  }
  async function reloadAll() {
    setError("");
    try {
      await Promise.all([loadSubjects(), loadTimer(), loadSessions(), loadPlanner()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load Study. Please try again.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void reloadAll();
  }, []);
  useEffect(() => {
    if (!timer || timer.paused_at || !timer.active_since) return;
    const update = () => setElapsed(timer.elapsed_sec + Math.max(0, Math.floor((Date.now() - Date.parse(timer.active_since)) / 1e3)));
    update();
    const interval = window.setInterval(update, 1e3);
    return () => window.clearInterval(interval);
  }, [timer]);
  const analyticsRange = useMemo(() => {
    if (analyticsMode === "week") {
      const from2 = addDays(mondayOf(today), periodOffset * 7);
      return { from: from2, to: addDays(from2, 6) };
    }
    const current = /* @__PURE__ */ new Date(`${today}T12:00:00Z`);
    current.setUTCMonth(current.getUTCMonth() + periodOffset, 1);
    const from = current.toISOString().slice(0, 10);
    const lastDay = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    return { from, to: lastDay };
  }, [analyticsMode, periodOffset, today]);
  useEffect(() => {
    if (page !== "Analytics") return;
    let current = true;
    send(`/study/analytics?from=${analyticsRange.from}&to=${analyticsRange.to}`).then((result) => {
      if (current) setAnalyticsRows(result.rows);
    }).catch((cause) => {
      if (current) setError(cause instanceof Error ? cause.message : "Could not load analytics.");
    });
    return () => {
      current = false;
    };
  }, [page, analyticsRange.from, analyticsRange.to]);
  const visibleAnalyticsRows = analyticsRows.filter((row) => subjectFilter === "all" || row.subject_id === subjectFilter);
  const analyticsSubjects = activeSubjects.map(({ id, name, color }) => ({ id, name, color }));
  const analyticsDates = Array.from({ length: analyticsMode === "week" ? 7 : Number(analyticsRange.to.slice(-2)) }, (_, index) => addDays(analyticsRange.from, index));
  const dailyBars = analyticsDates.map((date) => ({ date, rows: visibleAnalyticsRows.filter((row) => row.date === date), minutes: visibleAnalyticsRows.filter((row) => row.date === date).reduce((sum, row) => sum + Number(row.minutes), 0) }));
  const totalMinutes = dailyBars.reduce((sum, day) => sum + day.minutes, 0);
  const averageMinutes = dailyBars.length ? totalMinutes / dailyBars.length : 0;
  const bestDay = dailyBars.reduce((best, day) => day.minutes > best.minutes ? day : best, { date: "", minutes: -1, rows: [] });
  const subjectTotals = analyticsSubjects.map((subject) => ({ ...subject, minutes: visibleAnalyticsRows.filter((row) => row.subject_id === subject.id).reduce((sum, row) => sum + Number(row.minutes), 0) })).sort((a, b) => a.minutes - b.minutes);
  const maximumMinutes = Math.max(1, ...dailyBars.map((day) => day.minutes));
  async function withBusy(operation) {
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
  async function createSubject(event) {
    event.preventDefault();
    await withBusy(async () => {
      await send("/subjects", "POST", { ...subjectDraft, examDate: subjectDraft.examDate || null });
      setSubjectDraft({ name: "", color: "#82977c", examDate: "" });
      await loadSubjects();
    });
  }
  async function saveSubject(subjectId) {
    await withBusy(async () => {
      await send(`/subjects/${subjectId}`, "PATCH", { ...editSubjectDraft, examDate: editSubjectDraft.examDate || null });
      setEditingSubject("");
      await loadSubjects();
    });
  }
  async function moveSubject(subject, direction) {
    const ordered = subjects.filter((item) => item.archived === subject.archived);
    const from = ordered.findIndex((item) => item.id === subject.id);
    const to = Math.max(0, Math.min(ordered.length - 1, from + direction));
    if (from === to) return;
    await withBusy(async () => {
      await Promise.all([
        send(`/subjects/${subject.id}`, "PATCH", { sortOrder: ordered[to].sort_order }),
        send(`/subjects/${ordered[to].id}`, "PATCH", { sortOrder: subject.sort_order })
      ]);
      await loadSubjects();
    });
  }
  async function createUnit(event) {
    event.preventDefault();
    if (!activeSubject || !newUnit.trim()) return;
    await withBusy(async () => {
      await send(`/subjects/${activeSubject.id}/items`, "POST", { title: newUnit.trim(), estMinutes: 120 });
      setNewUnit("");
      await loadSubjects();
    });
  }
  async function createTopic(event, unit) {
    event.preventDefault();
    const title = newTopic[unit.id]?.trim();
    if (!activeSubject || !title) return;
    await withBusy(async () => {
      await send(`/subjects/${activeSubject.id}/items`, "POST", { parentId: unit.id, title, estMinutes: newEstimate[unit.id] ?? 120 });
      setNewTopic((current) => ({ ...current, [unit.id]: "" }));
      await loadSubjects();
    });
  }
  async function saveItem(item) {
    if (!activeSubject) return;
    await withBusy(async () => {
      await send(`/subjects/${activeSubject.id}/items/${item.id}`, "PATCH", { title: editItemDraft.title, ...item.item_type === "topic" ? { estMinutes: editItemDraft.estMinutes } : {} });
      setEditingItem("");
      await loadSubjects();
    });
  }
  async function toggleTopic(item) {
    if (!activeSubject) return;
    await withBusy(async () => {
      await send(`/subjects/${activeSubject.id}/items/${item.id}`, "PATCH", { isDone: !item.is_done });
      await loadSubjects();
    });
  }
  async function moveItem(subjectId, items, item, direction) {
    const index = items.findIndex((candidate) => candidate.id === item.id);
    const target = Math.max(0, Math.min(items.length - 1, index + direction));
    if (target === index) return;
    await withBusy(async () => {
      await Promise.all([
        send(`/subjects/${subjectId}/items/${item.id}`, "PATCH", { sortOrder: items[target].sort_order }),
        send(`/subjects/${subjectId}/items/${items[target].id}`, "PATCH", { sortOrder: item.sort_order })
      ]);
      await loadSubjects();
    });
  }
  async function deleteItem(subjectId, item) {
    if (!window.confirm(`Delete \u201C${item.title}\u201D and its nested topics?`)) return;
    await withBusy(async () => {
      await send(`/subjects/${subjectId}/items/${item.id}`, "DELETE");
      await loadSubjects();
    });
  }
  async function submitManualSession(event) {
    event.preventDefault();
    await withBusy(async () => {
      await send("/study/sessions", "POST", { ...manualDraft, minutes: Number(manualDraft.minutes), note: manualDraft.note.trim() || null });
      setManualDraft((current) => ({ ...current, minutes: 30, note: "" }));
      await loadSessions();
      await loadSubjects();
    });
  }
  async function startTimer(subjectId) {
    await withBusy(async () => {
      try {
        await send("/study/timer/start", "POST", { subjectId });
      } catch (cause) {
        if (!(cause instanceof Error) || !cause.message.includes("current study timer")) throw cause;
        if (!window.confirm("A timer is already running. Stop it and start this subject?")) return;
        try {
          await send("/study/timer/stop", "POST", {});
        } catch (shortError) {
          if (!(shortError instanceof Error) || !shortError.message.includes("seconds")) throw shortError;
          if (!window.confirm(`${shortError.message}
Discard the short session?`)) return;
          await send("/study/timer/stop", "POST", { discardShort: true });
        }
        await send("/study/timer/start", "POST", { subjectId });
      }
      await loadTimer();
    });
  }
  async function stopTimer() {
    await withBusy(async () => {
      try {
        await send("/study/timer/stop", "POST", {});
      } catch (cause) {
        if (!(cause instanceof Error) || !cause.message.includes("seconds")) throw cause;
        if (!window.confirm(`${cause.message}
Discard this session?`)) return;
        await send("/study/timer/stop", "POST", { discardShort: true });
      }
      await loadTimer();
      await loadSessions();
      await loadSubjects();
    });
  }
  async function toggleTimerPause() {
    await withBusy(async () => {
      await send(`/study/timer/${timer?.paused_at ? "resume" : "pause"}`, "POST", {});
      await loadTimer();
    });
  }
  async function saveEditedSession(sessionId) {
    await withBusy(async () => {
      await send(`/study/sessions/${sessionId}`, "PATCH", { ...editSessionDraft, minutes: Number(editSessionDraft.minutes), note: editSessionDraft.note.trim() || null });
      setEditingSession("");
      await loadSessions();
      await loadSubjects();
    });
  }
  async function deleteSession(session) {
    if (!window.confirm("Delete this study session?")) return;
    await withBusy(async () => {
      await send(`/study/sessions/${session.id}`, "DELETE");
      await loadSessions();
      await loadSubjects();
    });
  }
  async function saveBuffer() {
    await withBusy(async () => {
      await updateSettings({ revisionBufferDays });
      await loadPlanner();
    });
  }
  const tabs = ["Subjects", "Timer", "Analytics", "Exam planner"];
  const sessionTotalToday = minutesLabel(Math.floor(dailyMinutes));
  return /* @__PURE__ */ jsxs("section", { className: "study-page", children: [
    /* @__PURE__ */ jsxs("div", { className: "study-header", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "auth-kicker", children: "YOUR LEARNING" }),
        /* @__PURE__ */ jsx("h1", { children: "Study" }),
        /* @__PURE__ */ jsx("p", { children: "Build steady progress, one session at a time." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "study-today-summary", children: [
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx(Clock3, { size: 16 }),
          " TODAY"
        ] }),
        /* @__PURE__ */ jsx("strong", { children: sessionTotalToday }),
        /* @__PURE__ */ jsxs("small", { children: [
          "of ",
          minutesLabel(dailyTarget),
          " goal"
        ] }),
        /* @__PURE__ */ jsx("div", { className: "study-goal-track", children: /* @__PURE__ */ jsx("i", { style: { width: `${Math.min(100, dailyMinutes / dailyTarget * 100)}%` } }) })
      ] })
    ] }),
    activeSubject && /* @__PURE__ */ jsxs("div", { className: "study-subject-banner", children: [
      /* @__PURE__ */ jsxs("button", { className: "study-back", onClick: () => setSelectedSubjectId(""), children: [
        /* @__PURE__ */ jsx(ArrowLeft, { size: 15 }),
        " All subjects"
      ] }),
      /* @__PURE__ */ jsx("span", { className: "study-subject-color", style: { backgroundColor: activeSubject.color } }),
      /* @__PURE__ */ jsx("strong", { children: activeSubject.name }),
      /* @__PURE__ */ jsxs("span", { children: [
        activeSubject.completion_percent,
        "% complete"
      ] })
    ] }),
    !activeSubject && /* @__PURE__ */ jsx("nav", { className: "study-tabs", "aria-label": "Study sections", children: tabs.map((tab) => /* @__PURE__ */ jsx("button", { className: page === tab ? "study-tab active" : "study-tab", onClick: () => setPage(tab), children: tab }, tab)) }),
    error && /* @__PURE__ */ jsx("p", { className: "study-error", role: "alert", children: error }),
    loading ? /* @__PURE__ */ jsx("div", { className: "study-loading", children: "Loading your study space\u2026" }) : activeSubject ? /* @__PURE__ */ jsxs("div", { className: "study-subject-detail", children: [
      /* @__PURE__ */ jsxs("div", { className: "study-detail-heading", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "study-overline", children: "SUBJECT SYLLABUS" }),
          /* @__PURE__ */ jsx("h2", { children: activeSubject.name }),
          /* @__PURE__ */ jsxs("p", { children: [
            activeSubject.weekly_minutes ? `${minutesLabel(activeSubject.weekly_minutes)} studied this week` : "No study time logged this week yet",
            activeSubject.exam_date ? ` \xB7 Exam ${(/* @__PURE__ */ new Date(`${activeSubject.exam_date}T12:00:00`)).toLocaleDateString(void 0, { month: "short", day: "numeric" })}` : ""
          ] })
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "study-outline", onClick: () => {
          setManualDraft((current) => ({ ...current, subjectId: activeSubject.id }));
          setPage("Timer");
          setSelectedSubjectId("");
        }, children: [
          /* @__PURE__ */ jsx(Clock3, { size: 15 }),
          " Log study time"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("form", { className: "study-inline-form", onSubmit: createUnit, children: [
        /* @__PURE__ */ jsx("input", { "aria-label": "New unit name", value: newUnit, onChange: (event) => setNewUnit(event.target.value), placeholder: "Add a unit", maxLength: 160, required: true }),
        /* @__PURE__ */ jsxs("button", { className: "study-primary", disabled: busy, children: [
          /* @__PURE__ */ jsx(Plus, { size: 15 }),
          " Add unit"
        ] })
      ] }),
      !activeSubject.units.length ? /* @__PURE__ */ jsxs("div", { className: "study-empty", children: [
        /* @__PURE__ */ jsx(BookOpen, { size: 23 }),
        /* @__PURE__ */ jsx("strong", { children: "Your syllabus starts here" }),
        /* @__PURE__ */ jsx("span", { children: "Add a unit, then break it into topics." })
      ] }) : /* @__PURE__ */ jsx("div", { className: "study-unit-list", children: activeSubject.units.map((unit, unitIndex) => /* @__PURE__ */ jsxs("article", { className: "study-unit", children: [
        /* @__PURE__ */ jsxs("div", { className: "study-unit-head", children: [
          /* @__PURE__ */ jsxs("div", { className: "study-unit-name", children: [
            /* @__PURE__ */ jsx("span", { className: "study-unit-number", children: String(unitIndex + 1).padStart(2, "0") }),
            editingItem === unit.id ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("input", { "aria-label": "Unit name", value: editItemDraft.title, onChange: (event) => setEditItemDraft((current) => ({ ...current, title: event.target.value })) }),
              /* @__PURE__ */ jsx("button", { className: "study-icon-action", "aria-label": "Save unit", onClick: () => void saveItem(unit), children: /* @__PURE__ */ jsx(Check, { size: 15 }) })
            ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("strong", { children: unit.title }),
              /* @__PURE__ */ jsx("button", { className: "study-icon-action", "aria-label": `Edit ${unit.title}`, onClick: () => {
                setEditingItem(unit.id);
                setEditItemDraft({ title: unit.title, estMinutes: unit.est_minutes });
              }, children: /* @__PURE__ */ jsx(Pencil, { size: 14 }) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "study-unit-progress", children: [
            unit.completion_percent,
            "%"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "study-unit-actions", children: [
            /* @__PURE__ */ jsx("button", { "aria-label": `Move ${unit.title} up`, onClick: () => void moveItem(activeSubject.id, activeSubject.units, unit, -1), children: /* @__PURE__ */ jsx(ArrowUp, { size: 13 }) }),
            /* @__PURE__ */ jsx("button", { "aria-label": `Move ${unit.title} down`, onClick: () => void moveItem(activeSubject.id, activeSubject.units, unit, 1), children: /* @__PURE__ */ jsx(ArrowDown, { size: 13 }) }),
            /* @__PURE__ */ jsx("button", { "aria-label": `Delete ${unit.title}`, onClick: () => void deleteItem(activeSubject.id, unit), children: /* @__PURE__ */ jsx(Trash2, { size: 14 }) })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "study-unit-track", children: /* @__PURE__ */ jsx("i", { style: { width: `${unit.completion_percent}%` } }) }),
        unit.topics.map((topic, topicIndex) => /* @__PURE__ */ jsxs("div", { className: `study-topic ${topic.is_done ? "topic-done" : ""}`, children: [
          /* @__PURE__ */ jsxs("label", { children: [
            /* @__PURE__ */ jsx("input", { type: "checkbox", checked: topic.is_done, onChange: () => void toggleTopic(topic) }),
            /* @__PURE__ */ jsx("span", { children: topic.title })
          ] }),
          /* @__PURE__ */ jsxs("small", { children: [
            topic.est_minutes,
            " min"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "study-unit-actions", children: [
            /* @__PURE__ */ jsx("button", { "aria-label": `Move ${topic.title} up`, onClick: () => void moveItem(activeSubject.id, unit.topics, topic, -1), children: /* @__PURE__ */ jsx(ArrowUp, { size: 12 }) }),
            /* @__PURE__ */ jsx("button", { "aria-label": `Move ${topic.title} down`, onClick: () => void moveItem(activeSubject.id, unit.topics, topic, 1), children: /* @__PURE__ */ jsx(ArrowDown, { size: 12 }) }),
            /* @__PURE__ */ jsx("button", { "aria-label": `Edit ${topic.title}`, onClick: () => {
              setEditingItem(topic.id);
              setEditItemDraft({ title: topic.title, estMinutes: topic.est_minutes });
            }, children: /* @__PURE__ */ jsx(Pencil, { size: 13 }) }),
            /* @__PURE__ */ jsx("button", { "aria-label": `Delete ${topic.title}`, onClick: () => void deleteItem(activeSubject.id, topic), children: /* @__PURE__ */ jsx(Trash2, { size: 13 }) })
          ] }),
          editingItem === topic.id && /* @__PURE__ */ jsxs("div", { className: "study-edit-row", children: [
            /* @__PURE__ */ jsx("input", { "aria-label": "Topic name", value: editItemDraft.title, onChange: (event) => setEditItemDraft((current) => ({ ...current, title: event.target.value })) }),
            /* @__PURE__ */ jsx("input", { "aria-label": "Estimated minutes", type: "number", min: "0", value: editItemDraft.estMinutes, onChange: (event) => setEditItemDraft((current) => ({ ...current, estMinutes: Number(event.target.value) })) }),
            /* @__PURE__ */ jsx("button", { className: "study-primary", onClick: () => void saveItem(topic), children: "Save" })
          ] })
        ] }, topic.id)),
        editingItem === unit.id && /* @__PURE__ */ jsxs("div", { className: "study-edit-row", children: [
          /* @__PURE__ */ jsx("input", { "aria-label": "Unit title", value: editItemDraft.title, onChange: (event) => setEditItemDraft((current) => ({ ...current, title: event.target.value })) }),
          /* @__PURE__ */ jsx("button", { className: "study-primary", onClick: () => void saveItem(unit), children: "Save" })
        ] }),
        /* @__PURE__ */ jsxs("form", { className: "study-topic-form", onSubmit: (event) => void createTopic(event, unit), children: [
          /* @__PURE__ */ jsx("input", { "aria-label": `New topic for ${unit.title}`, value: newTopic[unit.id] ?? "", onChange: (event) => setNewTopic((current) => ({ ...current, [unit.id]: event.target.value })), placeholder: "Add a topic", maxLength: 160, required: true }),
          /* @__PURE__ */ jsx("input", { "aria-label": `Estimated minutes for ${unit.title}`, type: "number", min: "0", max: "100000", value: newEstimate[unit.id] ?? 120, onChange: (event) => setNewEstimate((current) => ({ ...current, [unit.id]: Number(event.target.value) })) }),
          /* @__PURE__ */ jsxs("button", { className: "study-outline", children: [
            /* @__PURE__ */ jsx(Plus, { size: 14 }),
            " Topic"
          ] })
        ] })
      ] }, unit.id)) })
    ] }) : page === "Subjects" ? /* @__PURE__ */ jsxs("div", { className: "study-subjects-view", children: [
      /* @__PURE__ */ jsxs("div", { className: "study-section-heading", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "study-overline", children: "YOUR SUBJECTS" }),
          /* @__PURE__ */ jsx("h2", { children: "Keep your syllabus moving" })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "study-archived-toggle", children: [
          /* @__PURE__ */ jsx("input", { type: "checkbox", checked: includeArchived, onChange: (event) => {
            setIncludeArchived(event.target.checked);
            void loadSubjects(event.target.checked);
          } }),
          " Show archived"
        ] })
      ] }),
      !subjects.length && !includeArchived && /* @__PURE__ */ jsxs("div", { className: "study-empty", children: [
        /* @__PURE__ */ jsx(BookOpen, { size: 23 }),
        /* @__PURE__ */ jsx("strong", { children: "No subjects yet" }),
        /* @__PURE__ */ jsx("span", { children: "Add a subject to start a syllabus and track study time." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "study-subject-grid", children: subjects.map((subject, index) => /* @__PURE__ */ jsxs("article", { className: `study-subject-card ${subject.archived ? "archived" : ""}`, children: [
        /* @__PURE__ */ jsxs("div", { className: "study-card-top", children: [
          /* @__PURE__ */ jsx("span", { className: "study-subject-color", style: { backgroundColor: subject.color } }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("strong", { children: subject.name }),
            /* @__PURE__ */ jsx("span", { children: subject.archived ? "Archived" : subject.exam_date ? `Exam ${(/* @__PURE__ */ new Date(`${subject.exam_date}T12:00:00`)).toLocaleDateString(void 0, { month: "short", day: "numeric" })}` : "No exam date" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "study-card-actions", children: [
            /* @__PURE__ */ jsx("button", { "aria-label": `Move ${subject.name} up`, onClick: () => void moveSubject(subject, -1), children: /* @__PURE__ */ jsx(ArrowUp, { size: 13 }) }),
            /* @__PURE__ */ jsx("button", { "aria-label": `Move ${subject.name} down`, onClick: () => void moveSubject(subject, 1), children: /* @__PURE__ */ jsx(ArrowDown, { size: 13 }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "study-subject-stat", children: [
          /* @__PURE__ */ jsxs("strong", { children: [
            subject.completion_percent,
            "%"
          ] }),
          /* @__PURE__ */ jsx("span", { children: "syllabus complete" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "study-unit-track", children: /* @__PURE__ */ jsx("i", { style: { width: `${subject.completion_percent}%`, backgroundColor: subject.color } }) }),
        /* @__PURE__ */ jsxs("div", { className: "study-subject-meta", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            minutesLabel(subject.weekly_minutes),
            " this week"
          ] }),
          subject.units.length > 0 && /* @__PURE__ */ jsxs("span", { children: [
            subject.units.length,
            " units"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "study-card-footer", children: [
          /* @__PURE__ */ jsxs("button", { onClick: () => setSelectedSubjectId(subject.id), children: [
            "Open syllabus ",
            /* @__PURE__ */ jsx(ArrowRight, { size: 14 })
          ] }),
          /* @__PURE__ */ jsx("button", { "aria-label": `Edit ${subject.name}`, onClick: () => {
            setEditingSubject(subject.id);
            setEditSubjectDraft({ name: subject.name, color: subject.color, examDate: subject.exam_date ?? "" });
          }, children: /* @__PURE__ */ jsx(Pencil, { size: 14 }) })
        ] }),
        editingSubject === subject.id && /* @__PURE__ */ jsxs("form", { className: "study-subject-edit", onSubmit: (event) => {
          event.preventDefault();
          void saveSubject(subject.id);
        }, children: [
          /* @__PURE__ */ jsx("input", { "aria-label": "Subject name", value: editSubjectDraft.name, onChange: (event) => setEditSubjectDraft((current) => ({ ...current, name: event.target.value })), required: true }),
          /* @__PURE__ */ jsxs("label", { children: [
            "Colour",
            /* @__PURE__ */ jsx("input", { "aria-label": "Subject colour", type: "color", value: editSubjectDraft.color, onChange: (event) => setEditSubjectDraft((current) => ({ ...current, color: event.target.value })) })
          ] }),
          /* @__PURE__ */ jsxs("label", { children: [
            "Exam date",
            /* @__PURE__ */ jsx("input", { "aria-label": "Exam date", type: "date", value: editSubjectDraft.examDate, onChange: (event) => setEditSubjectDraft((current) => ({ ...current, examDate: event.target.value })) })
          ] }),
          /* @__PURE__ */ jsx("button", { className: "study-primary", children: "Save" }),
          /* @__PURE__ */ jsx("button", { type: "button", className: "study-outline", onClick: () => void withBusy(async () => {
            await send(`/subjects/${subject.id}`, "PATCH", { archived: !subject.archived });
            setEditingSubject("");
            await loadSubjects();
          }), children: subject.archived ? "Unarchive" : "Archive" }),
          /* @__PURE__ */ jsx("button", { type: "button", className: "study-danger", onClick: () => {
            if (window.confirm(`Delete ${subject.name}, its syllabus, and study sessions?`)) void withBusy(async () => {
              await send(`/subjects/${subject.id}`, "DELETE");
              setEditingSubject("");
              await loadSubjects();
            });
          }, children: "Delete" })
        ] })
      ] }, subject.id)) }),
      /* @__PURE__ */ jsxs("form", { className: "study-create-subject", onSubmit: createSubject, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "study-overline", children: "ADD A SUBJECT" }),
          /* @__PURE__ */ jsx("h3", { children: "What are you studying?" })
        ] }),
        /* @__PURE__ */ jsx("input", { "aria-label": "Subject name", placeholder: "e.g. Biology", maxLength: 100, value: subjectDraft.name, onChange: (event) => setSubjectDraft((current) => ({ ...current, name: event.target.value })), required: true }),
        /* @__PURE__ */ jsxs("label", { children: [
          "Colour",
          /* @__PURE__ */ jsx("input", { "aria-label": "New subject colour", type: "color", value: subjectDraft.color, onChange: (event) => setSubjectDraft((current) => ({ ...current, color: event.target.value })) })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          "Exam date ",
          /* @__PURE__ */ jsx("span", { className: "optional-label", children: "optional" }),
          /* @__PURE__ */ jsx("input", { type: "date", value: subjectDraft.examDate, onChange: (event) => setSubjectDraft((current) => ({ ...current, examDate: event.target.value })) })
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "study-primary", disabled: busy, children: [
          /* @__PURE__ */ jsx(Plus, { size: 15 }),
          " Add subject"
        ] })
      ] })
    ] }) : page === "Timer" ? /* @__PURE__ */ jsxs("div", { className: "study-timer-layout", children: [
      /* @__PURE__ */ jsxs("article", { className: "study-panel study-timer-panel", children: [
        /* @__PURE__ */ jsx("span", { className: "study-overline", children: "STUDY TIMER" }),
        /* @__PURE__ */ jsx("h2", { children: timer ? timer.subject_name : "Choose a subject and begin" }),
        /* @__PURE__ */ jsxs("div", { className: "study-clock", "aria-live": "off", children: [
          String(Math.floor(elapsed / 3600)).padStart(2, "0"),
          ":",
          String(Math.floor(elapsed / 60) % 60).padStart(2, "0"),
          ":",
          String(elapsed % 60).padStart(2, "0")
        ] }),
        timer ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("p", { children: [
            timer.paused_at ? "Paused" : "Session in progress",
            " \xB7 refresh-safe timer"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "study-timer-controls", children: [
            /* @__PURE__ */ jsxs("button", { className: "study-primary", onClick: () => void toggleTimerPause(), disabled: busy, children: [
              timer.paused_at ? /* @__PURE__ */ jsx(Play, { size: 15 }) : /* @__PURE__ */ jsx(Square, { size: 14 }),
              timer.paused_at ? "Resume" : "Pause"
            ] }),
            /* @__PURE__ */ jsx("button", { className: "study-outline", onClick: () => void stopTimer(), disabled: busy, children: "Stop and save" })
          ] })
        ] }) : /* @__PURE__ */ jsxs("div", { className: "study-start-row", children: [
          /* @__PURE__ */ jsxs("select", { "aria-label": "Timer subject", value: manualDraft.subjectId || activeSubjects[0]?.id || "", onChange: (event) => setManualDraft((current) => ({ ...current, subjectId: event.target.value })), children: [
            /* @__PURE__ */ jsx("option", { value: "", disabled: true, children: "Select subject" }),
            activeSubjects.map((subject) => /* @__PURE__ */ jsx("option", { value: subject.id, children: subject.name }, subject.id))
          ] }),
          /* @__PURE__ */ jsxs("button", { className: "study-primary", disabled: !activeSubjects.length || busy, onClick: () => void startTimer(manualDraft.subjectId || activeSubjects[0]?.id || ""), children: [
            /* @__PURE__ */ jsx(Play, { size: 15 }),
            " Start timer"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("article", { className: "study-panel", children: [
        /* @__PURE__ */ jsx("span", { className: "study-overline", children: "MANUAL ENTRY" }),
        /* @__PURE__ */ jsx("h2", { children: "Log study time" }),
        /* @__PURE__ */ jsxs("form", { className: "study-manual-form", onSubmit: submitManualSession, children: [
          /* @__PURE__ */ jsxs("label", { children: [
            "Subject",
            /* @__PURE__ */ jsxs("select", { required: true, value: manualDraft.subjectId || activeSubjects[0]?.id || "", onChange: (event) => setManualDraft((current) => ({ ...current, subjectId: event.target.value })), children: [
              /* @__PURE__ */ jsx("option", { value: "", disabled: true, children: "Select subject" }),
              activeSubjects.map((subject) => /* @__PURE__ */ jsx("option", { value: subject.id, children: subject.name }, subject.id))
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "study-form-row", children: [
            /* @__PURE__ */ jsxs("label", { children: [
              "Date",
              /* @__PURE__ */ jsx("input", { type: "date", max: today, value: manualDraft.date, onChange: (event) => setManualDraft((current) => ({ ...current, date: event.target.value })), required: true })
            ] }),
            /* @__PURE__ */ jsxs("label", { children: [
              "Minutes",
              /* @__PURE__ */ jsx("input", { type: "number", min: "1", max: "1440", value: manualDraft.minutes, onChange: (event) => setManualDraft((current) => ({ ...current, minutes: Number(event.target.value) })), required: true })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("label", { children: [
            "Note ",
            /* @__PURE__ */ jsx("span", { className: "optional-label", children: "optional" }),
            /* @__PURE__ */ jsx("textarea", { maxLength: 500, value: manualDraft.note, onChange: (event) => setManualDraft((current) => ({ ...current, note: event.target.value })) })
          ] }),
          /* @__PURE__ */ jsx("button", { className: "study-primary", disabled: !activeSubjects.length || busy, children: "Save manual session" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("article", { className: "study-panel study-sessions-panel", children: [
        /* @__PURE__ */ jsx("span", { className: "study-overline", children: "TODAY" }),
        /* @__PURE__ */ jsxs("h2", { children: [
          "Study sessions ",
          /* @__PURE__ */ jsx("small", { children: sessionTotalToday })
        ] }),
        sessions.length ? /* @__PURE__ */ jsx("div", { className: "study-session-list", children: sessions.map((session) => /* @__PURE__ */ jsxs("div", { className: "study-session-row", children: [
          /* @__PURE__ */ jsx("span", { className: "study-subject-color", style: { backgroundColor: session.subject_color } }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("strong", { children: session.subject_name }),
            /* @__PURE__ */ jsxs("span", { children: [
              minutesLabel(Math.floor(session.duration_sec / 60)),
              " \xB7 ",
              session.source,
              session.note ? ` \xB7 ${session.note}` : ""
            ] })
          ] }),
          /* @__PURE__ */ jsx("button", { "aria-label": `Edit session for ${session.subject_name}`, onClick: () => {
            setEditingSession(session.id);
            setEditSessionDraft({ subjectId: session.subject_id, date: session.date, minutes: Math.max(1, Math.round(session.duration_sec / 60)), note: session.note ?? "" });
          }, children: /* @__PURE__ */ jsx(Pencil, { size: 14 }) }),
          /* @__PURE__ */ jsx("button", { "aria-label": `Delete session for ${session.subject_name}`, onClick: () => void deleteSession(session), children: /* @__PURE__ */ jsx(Trash2, { size: 14 }) }),
          editingSession === session.id && /* @__PURE__ */ jsxs("form", { className: "study-session-edit", onSubmit: (event) => {
            event.preventDefault();
            void saveEditedSession(session.id);
          }, children: [
            /* @__PURE__ */ jsx("select", { value: editSessionDraft.subjectId, onChange: (event) => setEditSessionDraft((current) => ({ ...current, subjectId: event.target.value })), children: activeSubjects.map((subject) => /* @__PURE__ */ jsx("option", { value: subject.id, children: subject.name }, subject.id)) }),
            /* @__PURE__ */ jsx("input", { type: "date", max: today, value: editSessionDraft.date, onChange: (event) => setEditSessionDraft((current) => ({ ...current, date: event.target.value })) }),
            /* @__PURE__ */ jsx("input", { "aria-label": "Session minutes", type: "number", min: "1", value: editSessionDraft.minutes, onChange: (event) => setEditSessionDraft((current) => ({ ...current, minutes: Number(event.target.value) })) }),
            /* @__PURE__ */ jsx("input", { "aria-label": "Session note", value: editSessionDraft.note, onChange: (event) => setEditSessionDraft((current) => ({ ...current, note: event.target.value })), placeholder: "Note" }),
            /* @__PURE__ */ jsx("button", { className: "study-primary", children: "Save" }),
            /* @__PURE__ */ jsx("button", { type: "button", className: "study-outline", onClick: () => setEditingSession(""), children: "Cancel" })
          ] })
        ] }, session.id)) }) : /* @__PURE__ */ jsx("p", { className: "study-muted", children: "No sessions logged today." })
      ] })
    ] }) : page === "Analytics" ? /* @__PURE__ */ jsxs("div", { className: "study-analytics-view", children: [
      /* @__PURE__ */ jsxs("div", { className: "study-section-heading", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "study-overline", children: "STUDY ANALYTICS" }),
          /* @__PURE__ */ jsx("h2", { children: analyticsMode === "week" ? "Weekly study time" : "Monthly study time" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "study-analytics-controls", children: [
          /* @__PURE__ */ jsx("button", { className: "study-outline", "aria-label": "Previous period", onClick: () => setPeriodOffset((value) => value - 1), children: /* @__PURE__ */ jsx(ArrowLeft, { size: 15 }) }),
          /* @__PURE__ */ jsx("button", { className: "study-outline", onClick: () => setPeriodOffset(0), children: "Today" }),
          /* @__PURE__ */ jsx("button", { className: "study-outline", "aria-label": "Next period", onClick: () => setPeriodOffset((value) => value + 1), children: /* @__PURE__ */ jsx(ArrowRight, { size: 15 }) }),
          /* @__PURE__ */ jsxs("div", { className: "study-mode-switch", children: [
            /* @__PURE__ */ jsx("button", { className: analyticsMode === "week" ? "selected" : "", onClick: () => {
              setAnalyticsMode("week");
              setPeriodOffset(0);
            }, children: "Week" }),
            /* @__PURE__ */ jsx("button", { className: analyticsMode === "month" ? "selected" : "", onClick: () => {
              setAnalyticsMode("month");
              setPeriodOffset(0);
            }, children: "Month" })
          ] })
        ] })
      ] }),
      analyticsMode === "month" && /* @__PURE__ */ jsxs("label", { className: "study-filter", children: [
        "Subject",
        /* @__PURE__ */ jsxs("select", { value: subjectFilter, onChange: (event) => setSubjectFilter(event.target.value), children: [
          /* @__PURE__ */ jsx("option", { value: "all", children: "All subjects" }),
          analyticsSubjects.map((subject) => /* @__PURE__ */ jsx("option", { value: subject.id, children: subject.name }, subject.id))
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "study-summary-grid", children: [
        /* @__PURE__ */ jsxs("article", { children: [
          /* @__PURE__ */ jsx("span", { children: "Total hours" }),
          /* @__PURE__ */ jsx("strong", { children: hoursLabel(totalMinutes) })
        ] }),
        /* @__PURE__ */ jsxs("article", { children: [
          /* @__PURE__ */ jsx("span", { children: "Average per day" }),
          /* @__PURE__ */ jsx("strong", { children: hoursLabel(averageMinutes) })
        ] }),
        /* @__PURE__ */ jsxs("article", { children: [
          /* @__PURE__ */ jsx("span", { children: "Best day" }),
          /* @__PURE__ */ jsx("strong", { children: bestDay.minutes > 0 ? `${hoursLabel(bestDay.minutes)} \xB7 ${(/* @__PURE__ */ new Date(`${bestDay.date}T12:00:00Z`)).toLocaleDateString(void 0, { weekday: "short" })}` : "\u2014" })
        ] }),
        /* @__PURE__ */ jsxs("article", { children: [
          /* @__PURE__ */ jsx("span", { children: "Least time" }),
          /* @__PURE__ */ jsx("strong", { children: subjectTotals[0]?.name ?? "\u2014" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("article", { className: "study-panel", children: [
        /* @__PURE__ */ jsx("div", { className: "study-chart", role: "img", "aria-label": `${analyticsMode} chart of hours studied by subject`, children: dailyBars.map((day) => /* @__PURE__ */ jsxs("div", { className: "study-bar-day", children: [
          /* @__PURE__ */ jsx("div", { className: "study-bar-stack", title: `${hoursLabel(day.minutes)} total`, style: { height: `${Math.max(2, day.minutes / maximumMinutes * 100)}%` }, children: day.rows.map((row) => /* @__PURE__ */ jsx("i", { title: `${row.subject}: ${hoursLabel(Number(row.minutes))}`, style: { height: `${day.minutes ? Number(row.minutes) / day.minutes * 100 : 0}%`, backgroundColor: row.color } }, row.subject_id)) }),
          /* @__PURE__ */ jsx("strong", { children: analyticsMode === "week" ? (/* @__PURE__ */ new Date(`${day.date}T12:00:00Z`)).toLocaleDateString(void 0, { weekday: "short" }) : day.date.slice(-2) }),
          /* @__PURE__ */ jsx("small", { children: hoursLabel(day.minutes) })
        ] }, day.date)) }),
        /* @__PURE__ */ jsx("div", { className: "study-chart-legend", children: analyticsSubjects.filter((subject) => subjectFilter === "all" || subject.id === subjectFilter).map((subject) => /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx("i", { style: { backgroundColor: subject.color } }),
          subject.name
        ] }, subject.id)) }),
        /* @__PURE__ */ jsx("div", { className: "study-table-wrap", children: /* @__PURE__ */ jsxs("table", { className: "study-data-table", children: [
          /* @__PURE__ */ jsx("caption", { children: "Study time by date and subject" }),
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("th", { children: "Date" }),
            analyticsSubjects.filter((subject) => subjectFilter === "all" || subject.id === subjectFilter).map((subject) => /* @__PURE__ */ jsx("th", { children: subject.name }, subject.id)),
            /* @__PURE__ */ jsx("th", { children: "Total" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { children: dailyBars.map((day) => /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("th", { scope: "row", children: (/* @__PURE__ */ new Date(`${day.date}T12:00:00Z`)).toLocaleDateString(void 0, { weekday: "short", month: "short", day: "numeric" }) }),
            analyticsSubjects.filter((subject) => subjectFilter === "all" || subject.id === subjectFilter).map((subject) => /* @__PURE__ */ jsx("td", { children: hoursLabel(Number(day.rows.find((row) => row.subject_id === subject.id)?.minutes ?? 0)) }, subject.id)),
            /* @__PURE__ */ jsx("td", { children: hoursLabel(day.minutes) })
          ] }, day.date)) })
        ] }) })
      ] })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "study-planner-view", children: [
      /* @__PURE__ */ jsxs("div", { className: "study-section-heading", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "study-overline", children: "EXAM COUNTDOWN" }),
          /* @__PURE__ */ jsx("h2", { children: "Revision planner" }),
          /* @__PURE__ */ jsx("p", { children: "Daily targets use unfinished topic estimates." })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "study-buffer", children: [
          "Revision buffer days",
          /* @__PURE__ */ jsx("input", { type: "number", min: "0", max: "365", value: revisionBufferDays, onChange: (event) => setRevisionBufferDays(Number(event.target.value)) }),
          /* @__PURE__ */ jsx("button", { className: "study-outline", onClick: () => void saveBuffer(), children: "Save" })
        ] })
      ] }),
      planner?.plans.length ? /* @__PURE__ */ jsx("div", { className: "study-planner-grid", children: planner.plans.map((plan) => /* @__PURE__ */ jsxs("article", { className: "study-plan-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "study-plan-title", children: [
          /* @__PURE__ */ jsx("span", { className: "study-subject-color", style: { backgroundColor: plan.color } }),
          /* @__PURE__ */ jsx("strong", { children: plan.subject }),
          /* @__PURE__ */ jsx("span", { className: `study-status ${plan.status}`, children: plan.status === "past" ? "Exam passed" : plan.status === "on_track" ? "On track" : "Behind" })
        ] }),
        plan.status === "past" ? /* @__PURE__ */ jsx("p", { className: "study-past-note", children: "Exam date passed" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "study-days-left", children: [
            /* @__PURE__ */ jsx("strong", { children: plan.daysLeft }),
            /* @__PURE__ */ jsx("span", { children: plan.daysLeft === 1 ? "day left" : "days left" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "study-plan-stats", children: [
            /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("strong", { children: plan.remainingTopics }),
              " topics remaining"
            ] }),
            /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("strong", { children: hoursLabel(plan.remainingMinutes) }),
              " remaining"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "study-daily-target", children: [
            "Study about ",
            /* @__PURE__ */ jsx("strong", { children: hoursLabel(plan.perDayMinutes ?? 0) }),
            " per day"
          ] })
        ] })
      ] }, plan.subjectId)) }) : /* @__PURE__ */ jsxs("div", { className: "study-empty", children: [
        /* @__PURE__ */ jsx(CalendarDays, { size: 23 }),
        /* @__PURE__ */ jsx("strong", { children: "No exams planned" }),
        /* @__PURE__ */ jsx("span", { children: "Add an exam date to a subject to build its revision plan." }),
        /* @__PURE__ */ jsx("button", { className: "study-outline", onClick: () => setPage("Subjects"), children: "Manage subjects" })
      ] })
    ] })
  ] });
}
export {
  StudySection
};
