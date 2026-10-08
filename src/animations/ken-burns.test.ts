import { describe, expect, it } from "vitest";
import { kenBurns } from "./ken-burns";

describe("kenBurns", () => {
  it("scale grows over the scene duration", () => {
    const opts = { intensity: 0.1, easing: "linear" as const };
    const start = kenBurns(0, 90, 30, opts);
    const end = kenBurns(89, 90, 30, opts);
    const s = (style: typeof start) => Number(style.transform?.match(/scale\(([\d.]+)\)/)?.[1]);
    expect(s(start)).toBeCloseTo(1, 1);
    expect(s(end)).toBeGreaterThan(s(start));
  });
});
