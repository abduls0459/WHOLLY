import { jsx, jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { ArrowRight, Flower2, ShieldCheck } from "lucide-react";
import { signIn, signUp, updateSettings } from "./lib/api";
import "./auth.css";
function AuthGate({ onSession }) {
  const [mode, setMode] = useState("register");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const fields = new FormData(event.currentTarget);
    try {
      const profile = mode === "register" ? await signUp({
        name: String(fields.get("name") ?? "").trim(),
        email: String(fields.get("email") ?? "").trim(),
        password: String(fields.get("password") ?? ""),
        timezone
      }) : await signIn({
        email: String(fields.get("email") ?? "").trim(),
        password: String(fields.get("password") ?? "")
      });
      onSession(profile);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return /* @__PURE__ */ jsxs("main", { className: "auth-layout", children: [
    /* @__PURE__ */ jsxs("section", { className: "auth-panel", children: [
      /* @__PURE__ */ jsxs("a", { className: "brand auth-brand", href: "#home", children: [
        /* @__PURE__ */ jsx("span", { className: "brand-mark", children: /* @__PURE__ */ jsx(Flower2, { size: 20, strokeWidth: 1.8 }) }),
        /* @__PURE__ */ jsxs("span", { children: [
          "wholly",
          /* @__PURE__ */ jsx("span", { className: "brand-period", children: "." })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "auth-copy", children: [
        /* @__PURE__ */ jsx("span", { className: "auth-kicker", children: "A LITTLE MORE BALANCE, EVERY DAY" }),
        /* @__PURE__ */ jsx("h1", { children: "Make space for what matters." }),
        /* @__PURE__ */ jsx("p", { children: "One calm place to keep up with your worship, your learning, and your wellbeing." })
      ] }),
      /* @__PURE__ */ jsxs("form", { className: "auth-form", onSubmit: submit, children: [
        /* @__PURE__ */ jsxs("div", { className: "auth-form-heading", children: [
          /* @__PURE__ */ jsx("h2", { children: mode === "register" ? "Create your space" : "Welcome back" }),
          /* @__PURE__ */ jsx("p", { children: mode === "register" ? "It starts with one small step." : "Pick up where you left off." })
        ] }),
        mode === "register" && /* @__PURE__ */ jsxs("label", { children: [
          "Your name",
          /* @__PURE__ */ jsx("input", { autoComplete: "name", name: "name", required: true, maxLength: 80, placeholder: "How should we call you?" })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          "Email address",
          /* @__PURE__ */ jsx("input", { autoComplete: "email", name: "email", required: true, type: "email", maxLength: 254, placeholder: "you@example.com" })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          "Password",
          /* @__PURE__ */ jsx("input", { autoComplete: mode === "register" ? "new-password" : "current-password", name: "password", required: true, type: "password", minLength: 8, maxLength: 72, placeholder: "At least 8 characters" })
        ] }),
        mode === "register" && /* @__PURE__ */ jsxs("p", { className: "detected-timezone", children: [
          "Time zone detected automatically ",
          /* @__PURE__ */ jsx("strong", { children: timezone })
        ] }),
        error && /* @__PURE__ */ jsx("p", { className: "form-error", role: "alert", children: error }),
        /* @__PURE__ */ jsxs("button", { className: "auth-submit", type: "submit", disabled: busy, children: [
          busy ? "Please wait\u2026" : mode === "register" ? "Create my account" : "Sign in",
          /* @__PURE__ */ jsx(ArrowRight, { size: 16 })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "auth-switch", children: [
          mode === "register" ? "Already have an account?" : "New to Wholly?",
          " ",
          /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => {
            setError("");
            setMode(mode === "register" ? "login" : "register");
          }, children: [
            " ",
            mode === "register" ? "Sign in" : "Create an account"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("p", { className: "privacy-note", children: [
        /* @__PURE__ */ jsx(ShieldCheck, { size: 15 }),
        " Your worship, study, and health data stays private to you."
      ] })
    ] }),
    /* @__PURE__ */ jsxs("aside", { className: "auth-art", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsxs("div", { className: "auth-art-caption", children: [
        /* @__PURE__ */ jsx("span", { children: "YOUR DAY, IN BALANCE" }),
        /* @__PURE__ */ jsxs("strong", { children: [
          "A little progress",
          /* @__PURE__ */ jsx("br", {}),
          "goes a long way."
        ] }),
        /* @__PURE__ */ jsx("i", { children: "One day, wholly. \u2733" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "auth-sun" }),
      /* @__PURE__ */ jsx("div", { className: "auth-hill auth-hill-back" }),
      /* @__PURE__ */ jsx("div", { className: "auth-hill auth-hill-front" }),
      /* @__PURE__ */ jsx("div", { className: "art-orbit orbit-one" }),
      /* @__PURE__ */ jsx("div", { className: "art-orbit orbit-two" })
    ] })
  ] });
}
function Onboarding({ profile, onComplete }) {
  const [fitnessGoal, setFitnessGoal] = useState(profile.fitness_goal);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await updateSettings({
        fitnessGoal,
        onboardingComplete: true
      });
      onComplete({ ...profile, fitness_goal: fitnessGoal, onboarding_complete: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return /* @__PURE__ */ jsxs("main", { className: "onboarding-wrap", children: [
    /* @__PURE__ */ jsxs("a", { className: "brand auth-brand", href: "#home", children: [
      /* @__PURE__ */ jsx("span", { className: "brand-mark", children: /* @__PURE__ */ jsx(Flower2, { size: 20 }) }),
      /* @__PURE__ */ jsxs("span", { children: [
        "wholly",
        /* @__PURE__ */ jsx("span", { className: "brand-period", children: "." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "onboarding-card", children: [
      /* @__PURE__ */ jsx("span", { className: "auth-kicker", children: "YOUR SPACE, YOUR PACE \xB7 1 OF 1" }),
      /* @__PURE__ */ jsx("h1", { children: "Let\u2019s make this yours." }),
      /* @__PURE__ */ jsx("p", { className: "onboarding-intro", children: "Choose a fitness goal. Your time zone is already set from your device." }),
      /* @__PURE__ */ jsxs("form", { className: "onboarding-form", onSubmit: submit, children: [
        /* @__PURE__ */ jsxs("div", { className: "form-section-title", children: [
          "Your fitness goal ",
          /* @__PURE__ */ jsx("span", { children: "Shapes your daily plan" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "goal-options", children: [["fat_loss", "Fat loss"], ["bulking", "Build strength"], ["maintain", "Maintain"]].map(([value, label]) => /* @__PURE__ */ jsxs("label", { className: `goal-option ${fitnessGoal === value ? "goal-selected" : ""}`, children: [
          /* @__PURE__ */ jsx("input", { type: "radio", name: "fitnessGoal", value, checked: fitnessGoal === value, onChange: () => setFitnessGoal(value) }),
          /* @__PURE__ */ jsx("span", { children: label })
        ] }, value)) }),
        error && /* @__PURE__ */ jsx("p", { className: "form-error", role: "alert", children: error }),
        /* @__PURE__ */ jsxs("button", { className: "auth-submit", type: "submit", disabled: busy, children: [
          busy ? "Saving\u2026" : "Finish setup",
          /* @__PURE__ */ jsx(ArrowRight, { size: 16 })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "onboarding-footnote", children: "Notification permission can be enabled when reminders are ready to set up." })
  ] });
}
export {
  AuthGate,
  Onboarding
};
