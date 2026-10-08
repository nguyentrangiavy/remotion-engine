import { useCurrentFrame, useVideoConfig } from "remotion";
import { getAnimationStyle } from "../engine/AnimationRenderer";
import { renderLayout } from "../engine/LayoutRenderer";
import type { Scene, VideoSpec } from "../schemas/video-spec";
import { QuoteText } from "../typography/QuoteText";

export const QuoteScene: React.FC<{ scene: Extract<Scene, { type: "quote" }>; style: VideoSpec["style"] }> = ({
  scene,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.round(scene.duration * fps);
  const animStyle = getAnimationStyle(scene.animation, frame, durationInFrames, fps);

  return renderLayout(
    (scene.layout?.type as "full-screen" | "centered" | "floating" | undefined) ?? "centered",
    <div style={animStyle}>
      <QuoteText quote={scene.quote} author={scene.author} color={style.primaryColor} accentColor={style.accentColor} />
    </div>,
  );
};
