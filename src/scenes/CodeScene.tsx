import { useCurrentFrame, useVideoConfig } from "remotion";
import { getAnimationStyle } from "../engine/AnimationRenderer";
import { renderLayout } from "../engine/LayoutRenderer";
import type { Scene, VideoSpec } from "../schemas/video-spec";
import { CodeText } from "../typography/CodeText";

export const CodeScene: React.FC<{ scene: Extract<Scene, { type: "code" }>; style: VideoSpec["style"] }> = ({
  scene,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.round(scene.duration * fps);
  // typewriter lo việc hiện dần ký tự ngay trong CodeText — animationPreset khác (vd. fade) vẫn áp cho khung bọc ngoài.
  const animStyle =
    scene.animation && scene.animation.type !== "typewriter"
      ? getAnimationStyle(scene.animation, frame, durationInFrames, fps)
      : {};

  return renderLayout(
    (scene.layout?.type as "full-screen" | "centered" | "floating" | undefined) ?? "centered",
    <div style={animStyle}>
      <CodeText code={scene.code} language={scene.language} />
    </div>,
  );
};
