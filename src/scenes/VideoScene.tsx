import { OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { getAnimationStyle } from "../engine/AnimationRenderer";
import { renderLayout } from "../engine/LayoutRenderer";
import type { Scene, VideoSpec } from "../schemas/video-spec";

export const VideoScene: React.FC<{ scene: Extract<Scene, { type: "video" }>; style: VideoSpec["style"] }> = ({
  scene,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.round(scene.duration * fps);
  const animStyle = getAnimationStyle(scene.animation, frame, durationInFrames, fps);

  return renderLayout(
    scene.layout?.type as "full-screen" | "centered" | "floating" | undefined,
    <OffthreadVideo
      src={staticFile(scene.src)}
      volume={scene.muted ? 0 : scene.volume}
      muted={scene.muted}
      style={{ width: "100%", height: "100%", objectFit: "cover", ...animStyle }}
    />,
  );
};
