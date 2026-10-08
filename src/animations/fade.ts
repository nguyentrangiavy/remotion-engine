import { interpolate } from "remotion";
import { getEasingFn } from "./easing";
import type { AnimationFn } from "./types";

export const fade: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const edge = Math.min(Math.round(fps * 0.4), Math.floor(durationInFrames / 2));
  const opacity = interpolate(
    frame,
    [0, edge, durationInFrames - edge, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: getEasingFn(opts.easing) },
  );
  return { opacity };
};
