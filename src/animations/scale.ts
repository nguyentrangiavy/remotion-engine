import { interpolate } from "remotion";
import { getEasingFn } from "./easing";
import type { AnimationFn } from "./types";

export const scale: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const popFrames = Math.min(durationInFrames, Math.round(fps * 0.5));
  const easing = getEasingFn(opts.easing);
  const s = interpolate(frame, [0, popFrames], [1 - opts.intensity, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
  const opacity = interpolate(frame, [0, popFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
  return { transform: `scale(${s})`, opacity };
};
