import { describe, expect, it } from "vitest";
import { getAnimationStyle } from "./AnimationRenderer";

describe("getAnimationStyle", () => {
  it("returns an empty style when there is no animation config", () => {
    expect(getAnimationStyle(undefined, 0, 90, 30)).toEqual({});
  });

  it("returns an empty style for 'typewriter' (handled by text components directly, not here)", () => {
    expect(
      getAnimationStyle({ type: "typewriter", duration: 1, intensity: 0.15, easing: "easeOut" }, 0, 90, 30),
    ).toEqual({});
  });

  it("dispatches to the fade function for type 'fade'", () => {
    const style = getAnimationStyle({ type: "fade", duration: 1, intensity: 0.15, easing: "easeOut" }, 0, 90, 30);
    expect(style.opacity).toBeCloseTo(0, 1);
  });

  it("dispatches every other registered animation type without throwing", () => {
    const types = ["zoom", "pan", "slide", "reveal", "kenBurns", "scale", "bounce"] as const;
    for (const type of types) {
      expect(() =>
        getAnimationStyle({ type, duration: 1, intensity: 0.15, easing: "easeOut" }, 10, 90, 30),
      ).not.toThrow();
    }
  });
});
