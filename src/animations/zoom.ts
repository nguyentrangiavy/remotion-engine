import { interpolate } from "remotion";
import { getEasingFn } from "./easing";
import type { AnimationFn } from "./types";

export const zoom: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const grow = opts.direction !== "out"; // mặc định "in"
  const from = grow ? 1 : 1 + opts.intensity;
  const to = grow ? 1 + opts.intensity : 1;
  const scale = interpolate(frame, [0, durationInFrames], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: getEasingFn(opts.easing),
  });
  return { transform: `scale(${scale})` };
};
