import type { CSSProperties } from "react";
import { bounce } from "../animations/bounce";
import { fade } from "../animations/fade";
import { kenBurns } from "../animations/ken-burns";
import { pan } from "../animations/pan";
import { reveal } from "../animations/reveal";
import { scale } from "../animations/scale";
import { slide } from "../animations/slide";
import type { AnimationFn } from "../animations/types";
import { zoom } from "../animations/zoom";
import type { AnimationConfig } from "../schemas/video-spec";

const REGISTRY: Record<string, AnimationFn> = { fade, zoom, pan, slide, reveal, kenBurns, scale, bounce };

export function getAnimationStyle(
  animation: AnimationConfig | undefined,
  frame: number,
  durationInFrames: number,
  fps: number,
): CSSProperties {
  if (!animation) return {};
  const fn = REGISTRY[animation.type];
  if (!fn) return {}; // "typewriter": không phải style CSS, xử lý riêng ở component chữ
  return fn(frame, durationInFrames, fps, {
    direction: animation.direction,
    intensity: animation.intensity,
    easing: animation.easing,
  });
}
