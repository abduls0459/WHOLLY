import { describe, expect, it } from "vitest";
import { qiblaBearing } from "./IslamicSection";
describe("Qibla bearing", () => {
  it("matches the specification fixture for New Delhi", () => {
    expect(qiblaBearing(28.6139, 77.209)).toBeCloseTo(266.6, 0);
  });
});
