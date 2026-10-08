import { describe, expect, it } from "vitest";
import { pan } from "./pan";

describe("pan", () => {
  it("translates along X for left/right, Y for up/down", () => {
    const left = pan(89, 90, 30, { direction: "left", intensity: 0.2, easing: "linear" });
    const up = pan(89, 90, 30, { direction: "up", intensity: 0.2, easing: "linear" });
    expect(left.transform).toContain("translateX");
    expect(up.transform).toContain("translateY");
  });

  it("starts at zero offset", () => {
    const style = pan(0, 90, 30, { direction: "left", intensity: 0.2, easing: "linear" });
    expect(style.transform).toContain("translateX(0%)");
  });
});
