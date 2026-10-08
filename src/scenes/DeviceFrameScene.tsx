import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { getAnimationStyle } from "../engine/AnimationRenderer";
import { renderLayout } from "../engine/LayoutRenderer";
import type { Scene, VideoSpec } from "../schemas/video-spec";

const FRAME_CHROME: Record<Extract<Scene, { type: "deviceFrame" }>["frame"], React.CSSProperties> = {
  browser: { border: "1px solid #2A2F3A", borderRadius: 10, boxShadow: "0 30px 80px rgba(0,0,0,0.5)" },
  macos: { border: "1px solid #2A2F3A", borderRadius: 14, boxShadow: "0 30px 80px rgba(0,0,0,0.5)" },
  phone: { border: "8px solid #111", borderRadius: 36, boxShadow: "0 30px 80px rgba(0,0,0,0.5)" },
  none: {},
};

export const DeviceFrameScene: React.FC<{
  scene: Extract<Scene, { type: "deviceFrame" }>;
  style: VideoSpec["style"];
}> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.round(scene.duration * fps);
  const animStyle = getAnimationStyle(scene.animation, frame, durationInFrames, fps);

  return renderLayout(
    (scene.layout?.type as "full-screen" | "centered" | "floating" | undefined) ?? "centered",
    <div style={{ width: "90%", aspectRatio: "16 / 10", overflow: "hidden", ...FRAME_CHROME[scene.frame] }}>
      <Img src={staticFile(scene.src)} style={{ width: "100%", height: "100%", objectFit: "cover", ...animStyle }} />
    </div>,
  );
};
