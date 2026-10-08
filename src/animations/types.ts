import type { CSSProperties } from "react";
import type { AnimationConfig } from "../schemas/video-spec";

export type AnimationOpts = Pick<AnimationConfig, "direction" | "intensity" | "easing">;
export type AnimationFn = (
  frame: number,
  durationInFrames: number,
  fps: number,
  opts: AnimationOpts,
) => CSSProperties;
