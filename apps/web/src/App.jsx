import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Dumbbell,
  Flame,
  Flower2,
  Footprints,
  LayoutDashboard,
  Moon,
  MoreHorizontal,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Target,
  Waves
} from "lucide-react";
import { AuthGate, Onboarding } from "./AuthGate";
import { IslamicSection } from "./IslamicSection";
import { StudySection } from "./StudySection";
import { FitnessSection } from "./FitnessSection";
import { getDashboard, restoreSession, signOut } from "./lib/api";
const navItems = [
  { name: "Home", icon: LayoutDashboard },
  { name: "Islamic", icon: Flower2 },
  { name: "Study", icon: BookOpen },
  { name: "Fitness", icon: Dumbbell },
  { name: "Settings", icon: Settings }
];
function App() {
  const [active, setActive] = useState("Home");
  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardError, setDashboardError] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => {
    let mounted = true;
    restoreSession().then((current) => {
      if (mounted) setProfile(current);
    }).catch(() => {
      if (mounted) setProfile(null);
    }).finally(() => {
      if (mounted) setLoadingSession(false);
    });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    if (!profile || active !== "Home") return;
    let current = true;
    setDashboardLoading(true);
    getDashboard().then((result) => {
      if (current) {
        setDashboard(result);
        setDashboardError("");
      }
    }).catch((cause) => {
      if (current) setDashboardError(cause instanceof Error ? cause.message : "Could not load your saved progress.");
    }).finally(() => {
      if (current) setDashboardLoading(false);
    });
    return () => {
      current = false;
    };
  }, [profile, active]);
  const today = /* @__PURE__ */ new Date();
  const localDate = new Intl.DateTimeFormat("en", {
    timeZone: profile?.timezone || "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(today).toUpperCase();
  const hijriDate = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", {
    timeZone: profile?.timezone || "UTC",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(today).toUpperCase();
  const prayerNames = ["Fajr", "Zuhr", "Asr", "Maghrib", "Isha"];
  const studyHours = Math.floor((dashboard?.studyMinutes ?? 0) / 60);
  const studyRemainder = (dashboard?.studyMinutes ?? 0) % 60;
  const studyTarget = dashboard?.studyTargetMinutes ?? profile?.study_daily_target_min ?? 180;
  async function logOut() {
    setLoggingOut(true);
    try {
      await signOut();
      setProfile(null);
      setActive("Home");
    } finally {
      setLoggingOut(false);
    }
  }
  if (loadingSession) return /* @__PURE__ */ jsxs("main", { className: "session-loading", "aria-label": "Loading your space", children: [
    /* @__PURE__ */ jsx("span", { className: "brand-mark", children: /* @__PURE__ */ jsx(Flower2, { size: 20 }) }),
    /* @__PURE__ */ jsx("span", { children: "Getting your space ready\u2026" })
  ] });
  if (!profile) return /* @__PURE__ */ jsx(AuthGate, { onSession: setProfile });
  if (!profile.onboarding_complete) return /* @__PURE__ */ jsx(Onboarding, { profile, onComplete: setProfile });
  return /* @__PURE__ */ jsxs("div", { className: "app-shell", children: [
    /* @__PURE__ */ jsxs("aside", { className: "sidebar", children: [
      /* @__PURE__ */ jsxs("a", { className: "brand", href: "#home", onClick: () => setActive("Home"), children: [
        /* @__PURE__ */ jsx("span", { className: "brand-mark", children: /* @__PURE__ */ jsx(Flower2, { size: 20, strokeWidth: 1.8 }) }),
        /* @__PURE__ */ jsxs("span", { children: [
          "wholly",
          /* @__PURE__ */ jsx("span", { className: "brand-period", children: "." })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "workspace-label", children: "YOUR SPACE" }),
      /* @__PURE__ */ jsx("nav", { className: "side-nav", "aria-label": "Main navigation", children: navItems.map(({ name, icon: Icon }) => /* @__PURE__ */ jsxs("button", { className: `nav-item ${active === name ? "selected" : ""}`, onClick: () => setActive(name), children: [
        /* @__PURE__ */ jsx(Icon, { size: 19, strokeWidth: 1.8 }),
        /* @__PURE__ */ jsx("span", { children: name }),
        name === "Islamic" && /* @__PURE__ */ jsx("span", { className: "nav-dot" })
      ] }, name)) }),
      /* @__PURE__ */ jsxs("div", { className: "sidebar-bottom", children: [
        /* @__PURE__ */ jsxs("div", { className: "sidebar-quote", children: [
          /* @__PURE__ */ jsx("span", { className: "quote-spark", children: /* @__PURE__ */ jsx(Sparkles, { size: 15 }) }),
          /* @__PURE__ */ jsx("p", { children: "Small steps, with intention." }),
          /* @__PURE__ */ jsx("span", { className: "quote-note", children: "A little every day adds up." })
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "profile-button", onClick: logOut, "aria-label": "Sign out", children: [
          /* @__PURE__ */ jsx("span", { className: "avatar", children: profile.name.slice(0, 1).toUpperCase() }),
          /* @__PURE__ */ jsxs("span", { className: "profile-copy", children: [
            /* @__PURE__ */ jsx("strong", { children: profile.name }),
            /* @__PURE__ */ jsx("small", { children: "Personal account" })
          ] }),
          /* @__PURE__ */ jsx(MoreHorizontal, { size: 19 })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("main", { className: "main-area", children: [
      /* @__PURE__ */ jsxs("header", { className: "topbar", children: [
        /* @__PURE__ */ jsxs("div", { className: "breadcrumb", children: [
          "Your space ",
          /* @__PURE__ */ jsx("span", { children: "/" }),
          " ",
          /* @__PURE__ */ jsx("strong", { children: active })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "topbar-actions", children: [
          /* @__PURE__ */ jsx("button", { className: "icon-button", "aria-label": "Help", children: /* @__PURE__ */ jsx(CircleHelp, { size: 19 }) }),
          /* @__PURE__ */ jsxs("button", { className: "today-button", children: [
            "Today ",
            /* @__PURE__ */ jsx(ChevronDown, { size: 15 })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "avatar avatar-small", children: profile.name.slice(0, 1).toUpperCase() })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "content", children: active === "Home" ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("section", { className: "welcome-row", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("div", { className: "eyebrow", children: [
              /* @__PURE__ */ jsx(Sun, { size: 15 }),
              " ",
              localDate,
              " ",
              /* @__PURE__ */ jsx("span", { className: "date-divider", children: "\xB7" }),
              " ",
              hijriDate
            ] }),
            /* @__PURE__ */ jsxs("h1", { children: [
              "A day to be present",
              /* @__PURE__ */ jsx("span", { className: "heading-period", children: "." })
            ] }),
            /* @__PURE__ */ jsx("p", { className: "welcome-subtitle", children: "A little progress in every part of your day." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "day-streak", children: [
            /* @__PURE__ */ jsx("span", { className: "streak-icon", children: /* @__PURE__ */ jsx(Flame, { size: 19 }) }),
            /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("strong", { children: dashboardLoading ? "Loading" : "Today" }),
              /* @__PURE__ */ jsx("small", { children: "saved progress" })
            ] })
          ] })
        ] }),
        dashboardError && /* @__PURE__ */ jsx("p", { className: "form-error", role: "alert", children: dashboardError }),
        /* @__PURE__ */ jsxs("section", { className: "overview-grid", "aria-label": "Today's progress", children: [
          /* @__PURE__ */ jsxs("article", { className: "overview-card prayer-overview", children: [
            /* @__PURE__ */ jsxs("div", { className: "card-heading", children: [
              /* @__PURE__ */ jsx("span", { className: "module-icon islamic-icon", children: /* @__PURE__ */ jsx(Flower2, { size: 18 }) }),
              /* @__PURE__ */ jsx("span", { className: "module-label", children: "ISLAMIC" }),
              /* @__PURE__ */ jsx("button", { className: "subtle-icon", "aria-label": "Open Islamic section", onClick: () => setActive("Islamic"), children: /* @__PURE__ */ jsx(ArrowUpRight, { size: 17 }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "prayer-progress", children: [
              /* @__PURE__ */ jsxs("span", { children: [
                /* @__PURE__ */ jsx("strong", { children: dashboard?.prayerCount ?? "\u2014" }),
                /* @__PURE__ */ jsx("span", { className: "progress-out-of", children: " / 5 prayers saved" })
              ] }),
              /* @__PURE__ */ jsx("span", { className: "next-prayer", children: "Prayer times unavailable" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "prayer-dots", "aria-label": "Prayer checklist", children: prayerNames.map((name) => {
              const done = dashboard?.prayerNames?.includes(name) ?? false;
              return /* @__PURE__ */ jsxs("button", { className: `prayer-chip ${done ? "is-done" : ""}`, onClick: () => setActive("Islamic"), "aria-label": `Open ${name} prayer log`, children: [
                /* @__PURE__ */ jsx("span", { className: "prayer-status", children: done ? /* @__PURE__ */ jsx(Check, { size: 12, strokeWidth: 3 }) : null }),
                /* @__PURE__ */ jsx("span", { className: "prayer-name", children: name }),
                /* @__PURE__ */ jsx("span", { className: "prayer-time", children: done ? "Saved" : "Open log" })
              ] }, name);
            }) }),
            /* @__PURE__ */ jsxs("div", { className: "card-footnote", children: [
              /* @__PURE__ */ jsx("span", { className: "live-dot" }),
              " Times unavailable ",
              /* @__PURE__ */ jsx("strong", { children: "Location service not connected" }),
              /* @__PURE__ */ jsx(ArrowRight, { size: 14 })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("article", { className: "overview-card study-overview", children: [
            /* @__PURE__ */ jsxs("div", { className: "card-heading", children: [
              /* @__PURE__ */ jsx("span", { className: "module-icon study-icon", children: /* @__PURE__ */ jsx(BookOpen, { size: 18 }) }),
              /* @__PURE__ */ jsx("span", { className: "module-label", children: "STUDY" }),
              /* @__PURE__ */ jsx("button", { className: "subtle-icon", "aria-label": "Open Study section", onClick: () => setActive("Study"), children: /* @__PURE__ */ jsx(ArrowUpRight, { size: 17 }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "study-amount", children: [
              /* @__PURE__ */ jsx("strong", { children: dashboardLoading ? "\u2014" : /* @__PURE__ */ jsxs(Fragment, { children: [
                studyHours,
                /* @__PURE__ */ jsx("span", { children: "h" }),
                " ",
                studyRemainder,
                /* @__PURE__ */ jsx("span", { children: "m" })
              ] }) }),
              /* @__PURE__ */ jsxs("span", { className: "goal-label", children: [
                "of ",
                Math.floor(studyTarget / 60),
                "h daily goal"
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "progress-track", children: /* @__PURE__ */ jsx("span", { className: "study-fill", style: { width: `${Math.min(100, (dashboard?.studyMinutes ?? 0) / Math.max(1, studyTarget) * 100)}%` } }) }),
            /* @__PURE__ */ jsx("div", { className: "study-foot", children: dashboard?.studyBySubject?.length ? dashboard.studyBySubject.slice(0, 2).map((item) => /* @__PURE__ */ jsxs("span", { children: [
              /* @__PURE__ */ jsx("span", { className: "tiny-color-dot", style: { backgroundColor: item.color } }),
              " ",
              item.name,
              " ",
              /* @__PURE__ */ jsxs("strong", { children: [
                Math.floor(item.minutes / 60),
                "h ",
                item.minutes % 60,
                "m"
              ] })
            ] }, item.id)) : /* @__PURE__ */ jsx("span", { children: "No study sessions saved today." }) }),
            /* @__PURE__ */ jsxs("button", { className: "timer-button", onClick: () => setActive("Study"), children: [
              /* @__PURE__ */ jsx(Clock3, { size: 15 }),
              " Continue studying ",
              /* @__PURE__ */ jsx(ArrowRight, { size: 15 })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("article", { className: "overview-card fitness-overview", children: [
            /* @__PURE__ */ jsxs("div", { className: "card-heading", children: [
              /* @__PURE__ */ jsx("span", { className: "module-icon fitness-icon", children: /* @__PURE__ */ jsx(Dumbbell, { size: 18 }) }),
              /* @__PURE__ */ jsx("span", { className: "module-label", children: "FITNESS" }),
              /* @__PURE__ */ jsx("button", { className: "subtle-icon", "aria-label": "Open Fitness section", onClick: () => setActive("Fitness"), children: /* @__PURE__ */ jsx(ArrowUpRight, { size: 17 }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "water-row", children: [
              /* @__PURE__ */ jsx("div", { className: "water-ring", children: /* @__PURE__ */ jsx(Waves, { size: 21 }) }),
              /* @__PURE__ */ jsxs("div", { className: "water-label", children: [
                /* @__PURE__ */ jsxs("strong", { children: [
                  (dashboard?.waterMl ?? 0).toLocaleString(),
                  " ",
                  /* @__PURE__ */ jsxs("small", { children: [
                    "/ ",
                    (dashboard?.waterGoalMl ?? profile.water_goal_ml ?? 2500).toLocaleString(),
                    " ml"
                  ] })
                ] }),
                /* @__PURE__ */ jsx("span", { children: "water so far" })
              ] }),
              /* @__PURE__ */ jsx("button", { className: "add-water", "aria-label": "Open Fitness to log water", onClick: () => setActive("Fitness"), children: /* @__PURE__ */ jsx(Plus, { size: 16 }) })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "progress-track water-track", children: /* @__PURE__ */ jsx("span", { className: "water-fill", style: { width: `${Math.min(100, (dashboard?.waterMl ?? 0) / Math.max(1, dashboard?.waterGoalMl ?? profile.water_goal_ml ?? 2500) * 100)}%` } }) }),
            /* @__PURE__ */ jsxs("div", { className: "fitness-stats", children: [
              /* @__PURE__ */ jsxs("span", { children: [
                /* @__PURE__ */ jsx("span", { className: "meal-check", children: /* @__PURE__ */ jsx(Check, { size: 11 }) }),
                " Meals ",
                /* @__PURE__ */ jsxs("strong", { children: [
                  dashboard?.completedMeals ?? 0,
                  " / ",
                  dashboard?.mealCount ?? 0
                ] })
              ] }),
              /* @__PURE__ */ jsxs("span", { children: [
                /* @__PURE__ */ jsx(Footprints, { size: 15 }),
                " Steps ",
                /* @__PURE__ */ jsxs("strong", { children: [
                  (dashboard?.steps ?? 0).toLocaleString(),
                  " / ",
                  (dashboard?.stepsTarget ?? profile.steps_target ?? 1e4).toLocaleString()
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "workout-status", children: [
              /* @__PURE__ */ jsx("span", { className: "rest-moon", children: /* @__PURE__ */ jsx(Moon, { size: 15 }) }),
              /* @__PURE__ */ jsxs("span", { children: [
                dashboard?.workoutDone ? "Workout logged" : "No workout logged",
                " ",
                /* @__PURE__ */ jsx("small", { children: "Fitness entries are saved to your account" })
              ] }),
              /* @__PURE__ */ jsx(ArrowDownRight, { size: 16 })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("section", { className: "lower-grid", children: [
          /* @__PURE__ */ jsxs("article", { className: "focus-card", children: [
            /* @__PURE__ */ jsxs("div", { className: "focus-copy", children: [
              /* @__PURE__ */ jsxs("span", { className: "focus-label", children: [
                /* @__PURE__ */ jsx(Sparkles, { size: 14 }),
                " YOUR DAILY INTENTION"
              ] }),
              /* @__PURE__ */ jsx("h2", { children: "Be where your feet are." }),
              /* @__PURE__ */ jsx("p", { children: "One thing at a time is enough." }),
              /* @__PURE__ */ jsxs("button", { className: "focus-action", onClick: () => setActive("Settings"), children: [
                "Set an intention ",
                /* @__PURE__ */ jsx(ArrowRight, { size: 15 })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "focus-art", "aria-hidden": "true", children: [
              /* @__PURE__ */ jsx("span", { className: "sun-disc" }),
              /* @__PURE__ */ jsx("span", { className: "hill hill-back" }),
              /* @__PURE__ */ jsx("span", { className: "hill hill-front" }),
              /* @__PURE__ */ jsx("span", { className: "art-leaf leaf-one" }),
              /* @__PURE__ */ jsx("span", { className: "art-leaf leaf-two" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("article", { className: "weekly-card", children: [
            /* @__PURE__ */ jsxs("div", { className: "weekly-heading", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { className: "module-label", children: "YOUR WEEK" }),
                /* @__PURE__ */ jsx("h2", { children: "Steady looks good on you." })
              ] }),
              /* @__PURE__ */ jsx("button", { className: "subtle-icon", "aria-label": "View weekly activity", children: /* @__PURE__ */ jsx(ArrowUpRight, { size: 17 }) })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "week-days", children: /* @__PURE__ */ jsx("p", { children: "Home totals update from saved prayer, study, and fitness records." }) }),
            /* @__PURE__ */ jsxs("div", { className: "weekly-note", children: [
              /* @__PURE__ */ jsx(Target, { size: 15 }),
              /* @__PURE__ */ jsxs("span", { children: [
                dashboard?.studyMinutes ?? 0,
                " study minutes saved today."
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("footer", { className: "page-footer", children: [
          /* @__PURE__ */ jsx("span", { children: "Make room for what matters." }),
          /* @__PURE__ */ jsxs("span", { children: [
            "One day, wholly. ",
            /* @__PURE__ */ jsx("span", { className: "footer-flower", children: "\u2733" })
          ] })
        ] })
      ] }) : active === "Islamic" ? /* @__PURE__ */ jsx(IslamicSection, { profile }) : active === "Study" ? /* @__PURE__ */ jsx(StudySection, { profile }) : active === "Fitness" ? /* @__PURE__ */ jsx(FitnessSection, { profile, onProfileChange: setProfile }) : active === "Settings" ? /* @__PURE__ */ jsxs("section", { className: "module-page", children: [
        /* @__PURE__ */ jsx("span", { className: "auth-kicker", children: "YOUR ACCOUNT" }),
        /* @__PURE__ */ jsx("h1", { children: "Settings" }),
        /* @__PURE__ */ jsx("p", { children: "These details stay private to your account." }),
        /* @__PURE__ */ jsxs("div", { className: "settings-summary", children: [
          /* @__PURE__ */ jsx("span", { className: "settings-avatar", children: profile.name.slice(0, 1).toUpperCase() }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("strong", { children: profile.name }),
            /* @__PURE__ */ jsx("span", { children: profile.email })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("dl", { className: "settings-details", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Time zone" }),
            /* @__PURE__ */ jsx("dd", { children: profile.timezone })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Fitness goal" }),
            /* @__PURE__ */ jsx("dd", { children: profile.fitness_goal.replace("_", " ") })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "auth-submit settings-logout", onClick: logOut, disabled: loggingOut, children: [
          loggingOut ? "Signing out\u2026" : "Sign out",
          /* @__PURE__ */ jsx(ArrowRight, { size: 16 })
        ] })
      ] }) : /* @__PURE__ */ jsxs("section", { className: "module-page", children: [
        /* @__PURE__ */ jsxs("span", { className: "auth-kicker", children: [
          "YOUR SPACE \xB7 ",
          active.toUpperCase()
        ] }),
        /* @__PURE__ */ jsx("h1", { children: active }),
        /* @__PURE__ */ jsx("p", { children: "This module is queued for its feature phase. Your data will be stored in your account when it\u2019s ready." }),
        /* @__PURE__ */ jsxs("div", { className: "module-next", children: [
          /* @__PURE__ */ jsx(Sparkles, { size: 18 }),
          /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Coming up next" }),
            /* @__PURE__ */ jsx("small", { children: "Prayer tracking, study logging, and fitness activity will connect to your private account." })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "focus-action", onClick: () => setActive("Home"), children: [
          "Back to today ",
          /* @__PURE__ */ jsx(ArrowRight, { size: 15 })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx("nav", { className: "mobile-nav", "aria-label": "Mobile navigation", children: navItems.map(({ name, icon: Icon }) => /* @__PURE__ */ jsxs("button", { className: active === name ? "mobile-selected" : "", onClick: () => setActive(name), children: [
      /* @__PURE__ */ jsx(Icon, { size: 19 }),
      /* @__PURE__ */ jsx("span", { children: name })
    ] }, name)) })
  ] });
}
var App_default = App;
export {
  App_default as default
};
