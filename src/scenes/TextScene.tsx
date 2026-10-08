import { useCurrentFrame, useVideoConfig } from "remotion";
import { getAnimationStyle } from "../engine/AnimationRenderer";
import { renderLayout } from "../engine/LayoutRenderer";
import type { Scene, VideoSpec } from "../schemas/video-spec";
import { CounterText } from "../typography/CounterText";
import { HeroText } from "../typography/HeroText";
import { HighlightText } from "../typography/HighlightText";
import { KineticText } from "../typography/KineticText";
import { Subtitle } from "../typography/Subtitle";

export const TextScene: React.FC<{ scene: Extract<Scene, { type: "text" }>; style: VideoSpec["style"] }> = ({
  scene,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.round(scene.duration * fps);
  const animStyle =
    scene.animation?.type === "typewriter" ? {} : getAnimationStyle(scene.animation, frame, durationInFrames, fps);

  const content = (() => {
    switch (scene.text.type) {
      case "kinetic":
        return <KineticText text={scene.text.content} color={style.primaryColor} />;
      case "subtitle":
        return <Subtitle color={style.primaryColor}>{scene.text.content}</Subtitle>;
      case "highlight":
        return (
          <HighlightText color={style.primaryColor} accentColor={style.accentColor}>
            {scene.text.content}
          </HighlightText>
        );
      case "counter": {
        const to = Number(scene.text.content) || 0;
        return <CounterText to={to} durationInFrames={durationInFrames} color={style.primaryColor} />;
      }
      case "hero":
      default:
        return <HeroText color={style.primaryColor}>{scene.text.content}</HeroText>;
    }
  })();

  return renderLayout(
    scene.layout?.type as "full-screen" | "centered" | "floating" | undefined,
    <div style={animStyle}>{content}</div>,
  );
};
