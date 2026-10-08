import { describe, expect, it } from "vitest";
import { fade } from "./fade";

const opts = { intensity: 0.15, easing: "easeOut" as const };

describe("fade", () => {
  it("starts at opacity 0 and ends at opacity 0, peaking at 1 in the middle", () => {
    expect(fade(0, 90, 30, opts).opacity).toBeCloseTo(0, 1);
    expect(fade(45, 90, 30, opts).opacity).toBeCloseTo(1, 1);
    expect(fade(89, 90, 30, opts).opacity).toBeLessThan(0.2);
  });
});
