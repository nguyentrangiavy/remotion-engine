import { describe, expect, it } from "vitest";
import { slide } from "./slide";

describe("slide", () => {
  it("starts off-screen and ends at translate 0", () => {
    const opts = { direction: "left" as const, intensity: 0.15, easing: "linear" as const };
    const start = slide(0, 90, 30, opts);
    const end = slide(89, 90, 30, opts);
    expect(start.transform).not.toContain("translateX(0%)");
    expect(end.transform).toContain("translateX(0%)");
  });
});
