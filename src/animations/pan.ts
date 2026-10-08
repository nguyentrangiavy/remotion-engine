import { interpolate } from "remotion";
import { getEasingFn } from "./easing";
import type { AnimationFn } from "./types";

export const pan: AnimationFn = (frame, durationInFrames, fps, opts) => {
  const distance = opts.intensity * 20; // % dịch chuyển tối đa
  const axis = opts.direction === "up" || opts.direction === "down" ? "Y" : "X";
  const sign = opts.direction === "left" || opts.direction === "up" ? -1 : 1;
  const t = interpolate(frame, [0, durationInFrames], [0, sign * distance], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: getEasingFn(opts.easing),
  });
  // scale(1.15) để nền vẫn phủ kín khung hình khi đã dịch chuyển
  return { transform: `scale(1.15) translate${axis}(${t}%)` };
};
