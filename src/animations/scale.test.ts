import { describe, expect, it } from "vitest";
import { scale } from "./scale";

describe("scale", () => {
  it("pops in from below 1 to exactly 1, fading in alongside", () => {
    const opts = { intensity: 0.3, easing: "linear" as const };
    const start = scale(0, 90, 30, opts);
    const end = scale(45, 90, 30, opts);
    expect(start.opacity).toBeCloseTo(0, 1);
    expect(end.opacity).toBeCloseTo(1, 1);
  });
});
