import { jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthGate, Onboarding } from "./AuthGate";
const { updateSettings } = vi.hoisted(() => ({ updateSettings: vi.fn().mockResolvedValue({}) }));
vi.mock("./lib/api", () => ({ signIn: vi.fn(), signUp: vi.fn(), updateSettings }));
const profile = {
  id: "user-1",
  name: "Test User",
  email: "test@example.test",
  timezone: "Asia/Kolkata",
  latitude: null,
  longitude: null,
  location_label: null,
  calc_method: 1,
  asr_school: 1,
  fitness_goal: "maintain",
  onboarding_complete: false
};
describe("simple account setup", () => {
  it("shows a detected time zone without location or prayer method inputs", () => {
    render(/* @__PURE__ */ jsx(AuthGate, { onSession: () => {
    } }));
    expect(screen.getByText("Time zone detected automatically")).toBeTruthy();
    expect(screen.queryByLabelText(/latitude|longitude|calculation method|asr school/i)).toBeNull();
    expect(screen.queryByRole("textbox", { name: /time zone/i })).toBeNull();
  });
  it("saves only the fitness goal and onboarding status", async () => {
    const onComplete = vi.fn();
    render(/* @__PURE__ */ jsx(Onboarding, { profile, onComplete }));
    expect(screen.queryByLabelText(/latitude|longitude|calculation method|asr school/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /finish setup/i }));
    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith({ fitnessGoal: "maintain", onboardingComplete: true }));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ onboarding_complete: true }));
  });
});
