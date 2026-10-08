import { Easing } from "remotion";
import type { AnimationConfig } from "../schemas/video-spec";

export function getEasingFn(name: AnimationConfig["easing"]): (input: number) => number {
  switch (name) {
    case "linear":
      return Easing.linear;
    case "easeIn":
      return Easing.in(Easing.ease);
    case "easeInOut":
      return Easing.inOut(Easing.ease);
    case "easeOut":
    default:
      return Easing.out(Easing.ease);
  }
}
