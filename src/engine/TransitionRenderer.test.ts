import { describe, expect, it } from "vitest";
import { getTransitionPresentation, getTransitionTiming } from "./TransitionRenderer";

describe("getTransitionTiming", () => {
  it("converts transition.duration (giây) sang durationInFrames theo fps", () => {
    const timing = getTransitionTiming({ type: "fade", duration: 0.5 }, 30);
    expect(timing.getDurationInFrames({ fps: 30 })).toBe(15);
  });
});

describe("getTransitionPresentation", () => {
  it("returns a defined presentation for every transition type without throwing", () => {
    const types = ["none", "fade", "slide", "wipe", "zoom", "blur"] as const;
    for (const type of types) {
      expect(() => getTransitionPresentation({ type, duration: 0.4 })).not.toThrow();
      expect(getTransitionPresentation({ type, duration: 0.4 })).toBeDefined();
    }
  });
});
