import { jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FitnessSection } from "./FitnessSection";
const { fitnessRequest, updateSettings } = vi.hoisted(() => ({ fitnessRequest: vi.fn(), updateSettings: vi.fn() }));
vi.mock("./lib/api", () => ({ fitnessRequest, updateSettings: vi.fn() }));
const profile = {
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
  steps_target: 1e4,
  wake_time: "07:00",
  sleep_time: "23:00",
  water_interval_min: 120,
  goal_weight_kg: null
};
describe("Fitness section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fitnessRequest.mockImplementation((path, init = {}) => {
      if (path.startsWith("/fitness/water")) return Promise.resolve({ entries: [], totalMl: 500, goalMl: 2450 });
      if (path.startsWith("/fitness/steps")) return Promise.resolve({ steps: 6500, target: 1e4 });
      if (path.startsWith("/fitness/meals")) return Promise.resolve({ slots: [{ id: "meal-1", name: "Lunch", time_local: "13:00", enabled: true, status: "pending", logged_at: null }] });
      if (path === "/fitness/schedule") return Promise.resolve({ days: [] });
      if (path.startsWith("/fitness/workouts")) return Promise.resolve({ workouts: [], exerciseNames: [] });
      if (path.startsWith("/fitness/body")) return Promise.resolve({ entries: [], goalWeightKg: null });
      return Promise.resolve({});
    });
    updateSettings.mockResolvedValue({ settings: {} });
  });
  it("shows account-backed daily totals and logs a quick water amount", async () => {
    render(/* @__PURE__ */ jsx(FitnessSection, { profile }));
    expect(await screen.findByText("Stay hydrated")).toBeTruthy();
    expect(screen.getByText("500")).toBeTruthy();
    expect(screen.getByText("6,500")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "+250 ml" }));
    await waitFor(() => expect(fitnessRequest).toHaveBeenCalledWith("/fitness/water", expect.objectContaining({ method: "POST" })));
  });
  it("offers the measurement history and daily logging form", async () => {
    render(/* @__PURE__ */ jsx(FitnessSection, { profile }));
    await screen.findAllByRole("button", { name: "Body" });
    fireEvent.click(screen.getAllByRole("button", { name: "Body" })[0]);
    expect(screen.getByText("See your progress over time")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save measurement" })).toBeTruthy();
  });
});
