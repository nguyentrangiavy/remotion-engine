import { interpolate } from "remotion";
import { getEasingFn } from "./easing";
import type { AnimationFn } from "./types";

export const slide: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const slideFrames = Math.min(durationInFrames, Math.round(fps * 0.5));
  const axis = opts.direction === "up" || opts.direction === "down" ? "Y" : "X";
  const from = opts.direction === "left" || opts.direction === "up" ? 100 : -100;
  const t = interpolate(frame, [0, slideFrames], [from, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: getEasingFn(opts.easing),
  });
  return { transform: `translate${axis}(${t}%)` };
};
