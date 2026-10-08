import { linearTiming, type TransitionPresentation, type TransitionTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { linearBlur } from "@remotion/transitions/linear-blur";
import { none } from "@remotion/transitions/none";
import { slide, type SlideDirection } from "@remotion/transitions/slide";
import { wipe, type WipeDirection } from "@remotion/transitions/wipe";
import { zoomInOut } from "@remotion/transitions/zoom-in-out";
import type { TransitionConfig } from "../schemas/video-spec";

function toSlideDirection(direction: TransitionConfig["direction"]): SlideDirection {
  switch (direction) {
    case "left":
      return "from-right";
    case "right":
      return "from-left";
    case "up":
      return "from-bottom";
    case "down":
      return "from-top";
    default:
      return "from-right";
  }
}

function toWipeDirection(direction: TransitionConfig["direction"]): WipeDirection {
  switch (direction) {
    case "left":
      return "from-right";
    case "right":
      return "from-left";
    case "up":
      return "from-bottom";
    case "down":
      return "from-top";
    default:
      return "from-left";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTransitionPresentation(transition: TransitionConfig): TransitionPresentation<any> {
  switch (transition.type) {
    case "fade":
      return fade();
    case "slide":
      return slide({ direction: toSlideDirection(transition.direction) });
    case "wipe":
      return wipe({ direction: toWipeDirection(transition.direction) });
    case "zoom":
      return zoomInOut({});
    case "blur":
      return linearBlur({});
    case "none":
    default:
      return none();
  }
}

export function getTransitionTiming(transition: TransitionConfig, fps: number): TransitionTiming {
  return linearTiming({ durationInFrames: Math.round(transition.duration * fps) });
}
