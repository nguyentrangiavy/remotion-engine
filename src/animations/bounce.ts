import { spring } from "remotion";
import type { AnimationFn } from "./types";

export const bounce: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const s = spring({
    frame,
    fps,
    config: { damping: 9, stiffness: 100 + opts.intensity * 100 },
    durationInFrames: Math.min(durationInFrames, fps * 2),
  });
  return { transform: `scale(${s})` };
};
