import { describe, expect, it } from "vitest";
import { zoom } from "./zoom";

describe("zoom", () => {
  it("direction 'in' grows the scale over time", () => {
    const start = zoom(0, 90, 30, { direction: "in", intensity: 0.2, easing: "linear" });
    const end = zoom(89, 90, 30, { direction: "in", intensity: 0.2, easing: "linear" });
    const startScale = Number(start.transform?.match(/scale\(([\d.]+)\)/)?.[1]);
    const endScale = Number(end.transform?.match(/scale\(([\d.]+)\)/)?.[1]);
    expect(startScale).toBeCloseTo(1, 1);
    expect(endScale).toBeCloseTo(1.2, 1);
  });

  it("direction 'out' shrinks the scale over time", () => {
    const start = zoom(0, 90, 30, { direction: "out", intensity: 0.2, easing: "linear" });
    const startScale = Number(start.transform?.match(/scale\(([\d.]+)\)/)?.[1]);
    expect(startScale).toBeCloseTo(1.2, 1);
  });
});
