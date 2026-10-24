import { jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
const api = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  getIslamicData: vi.fn(),
  saveIslamicData: vi.fn()
}));
vi.mock("./lib/api", () => ({
  getDashboard: api.getDashboard,
  getIslamicData: api.getIslamicData,
  saveIslamicData: api.saveIslamicData,
  restoreSession: vi.fn().mockResolvedValue({
    id: "test-user",
    name: "Test User",
    email: "test@example.test",
    timezone: "Asia/Kolkata",
    latitude: null,
    longitude: null,
    location_label: null,
    calc_method: 1,
    asr_school: 1,
    fitness_goal: "maintain",
    onboarding_complete: true,
    water_goal_ml: 2500,
    steps_target: 1e4
  }),
  signOut: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  updateSettings: vi.fn()
}));
describe("account-backed dashboard", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    api.getDashboard.mockResolvedValue({
      prayerCount: 2,
      prayerNames: ["Fajr", "Zuhr"],
      studyMinutes: 135,
      studyTargetMinutes: 180,
      studyBySubject: [{ id: "biology", name: "Biology", color: "#82977c", minutes: 80 }],
      waterMl: 500,
      waterGoalMl: 2500,
      steps: 0,
      stepsTarget: 1e4,
      completedMeals: 1,
      mealCount: 1,
      workoutDone: false
    });
    api.getIslamicData.mockResolvedValue({ data: null });
    api.saveIslamicData.mockResolvedValue({ data: null });
  });
  it("shows saved dashboard totals and sends prayer navigation to the Islamic tracker", async () => {
    render(/* @__PURE__ */ jsx(App, {}));
    await waitFor(() => expect(screen.getByText("2")).toBeTruthy());
    expect(screen.getByText((_, element) => element?.tagName === "STRONG" && element.textContent === "2h 15m")).toBeTruthy();
    expect(screen.getByText((_, element) => element?.tagName === "STRONG" && element.textContent?.includes("500"))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open Asr prayer log" }));
    expect(await screen.findByText("YOUR WORSHIP")).toBeTruthy();
  });
  it("saves Quran progress through the account API", async () => {
    render(/* @__PURE__ */ jsx(App, {}));
    fireEvent.click(await screen.findAllByRole("button", { name: "Islamic" }).then((items) => items[0]));
    fireEvent.click(screen.getByRole("button", { name: "Quran" }));
    fireEvent.click(await screen.findByRole("button", { name: "Mark whole Surah" }));
    expect(screen.getByText("0.1% complete")).toBeTruthy();
    await waitFor(() => expect(api.saveIslamicData).toHaveBeenCalledWith(expect.objectContaining({
      readings: expect.arrayContaining([expect.objectContaining({ surah: 1, from: 1, to: 7 })])
    })));
  });
  it("stores Dhikr taps through the account API instead of browser storage", async () => {
    render(/* @__PURE__ */ jsx(App, {}));
    fireEvent.click((await screen.findAllByRole("button", { name: "Islamic" }))[0]);
    fireEvent.click(screen.getByRole("button", { name: "Dhikr" }));
    fireEvent.click(screen.getByRole("button", { name: "Count SubhanAllah" }));
    await waitFor(() => expect(api.saveIslamicData).toHaveBeenCalledWith(expect.objectContaining({
      counts: expect.objectContaining({ [new Intl.DateTimeFormat("en-CA").format(/* @__PURE__ */ new Date())]: expect.objectContaining({ subhanallah: 1 }) })
    })));
  });
});
