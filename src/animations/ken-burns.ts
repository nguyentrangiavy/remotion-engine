import { interpolate } from "remotion";
import { getEasingFn } from "./easing";
import type { AnimationFn } from "./types";

export const kenBurns: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const easing = getEasingFn(opts.easing);
  const scale = interpolate(frame, [0, durationInFrames], [1, 1 + opts.intensity], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
  const translate = interpolate(frame, [0, durationInFrames], [0, -opts.intensity * 30], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
  return { transform: `scale(${scale}) translateX(${translate}%)` };
};
