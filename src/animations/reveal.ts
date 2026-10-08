import { interpolate } from "remotion";
import { getEasingFn } from "./easing";
import type { AnimationFn } from "./types";

export const reveal: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const revealFrames = Math.min(durationInFrames, Math.round(fps * 0.6));
  const hiddenPercent = interpolate(frame, [0, revealFrames], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: getEasingFn(opts.easing),
  });
  return { clipPath: `inset(0 ${hiddenPercent}% 0 0)` };
};
