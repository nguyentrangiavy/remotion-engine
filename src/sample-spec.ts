import type { VideoSpec } from "./schemas/video-spec";

export const SAMPLE_SPEC: VideoSpec = {
  version: "1.0",
  id: "sample",
  settings: { width: 1080, height: 1920, fps: 30, duration: 6 },
  style: { theme: "minimal", font: "Inter", primaryColor: "#FFFFFF", accentColor: "#7C5CFF", backgroundColor: "#050505" },
  audio: { musicVolume: 0.15, voice: "vi-VN-HoaiMyNeural", sfx: true },
  scenes: [
    {
      id: "hook",
      duration: 3,
      type: "text",
      text: { type: "hero", content: "remotion-engine", position: "center" },
      animation: { type: "reveal", duration: 1, intensity: 0.15, easing: "easeOut" },
    },
    {
      id: "tagline",
      duration: 3,
      type: "text",
      text: { type: "subtitle", content: "Một engine, nhiều video là dữ liệu.", position: "center" },
      animation: { type: "fade", duration: 1, intensity: 0.15, easing: "easeOut" },
      transition: { type: "fade", duration: 0.4 },
    },
  ],
};
