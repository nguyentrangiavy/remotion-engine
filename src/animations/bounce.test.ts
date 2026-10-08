import { describe, expect, it } from "vitest";
import { bounce } from "./bounce";

describe("bounce", () => {
  it("starts near scale 0 and settles near scale 1", () => {
    const opts = { intensity: 0.5, easing: "linear" as const };
    const start = bounce(0, 90, 30, opts);
    const settled = bounce(60, 90, 30, opts);
    const s = (style: typeof start) => Number(style.transform?.match(/scale\(([\d.]+)\)/)?.[1]);
    expect(s(start)).toBeLessThan(0.3);
    expect(s(settled)).toBeGreaterThan(0.85);
  });
});
