import { AbsoluteFill, Audio, staticFile } from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import { SceneRenderer } from "./engine/SceneRenderer";
import { getTransitionPresentation, getTransitionTiming } from "./engine/TransitionRenderer";
import type { VideoSpec } from "./schemas/video-spec";

export const Video: React.FC<{ spec: VideoSpec }> = ({ spec }) => {
  const { fps } = spec.settings;

  return (
    <AbsoluteFill style={{ backgroundColor: spec.style.backgroundColor }}>
      <TransitionSeries>
        {spec.scenes.flatMap((scene, i) => {
          const durationInFrames = Math.round(scene.duration * fps);
          const nodes = [
            <TransitionSeries.Sequence key={`${scene.id}-seq`} durationInFrames={durationInFrames}>
              <SceneRenderer scene={scene} style={spec.style} />
            </TransitionSeries.Sequence>,
          ];
          const nextScene = spec.scenes[i + 1];
          if (nextScene) {
            const transition = nextScene.transition ?? { type: "fade" as const, duration: 0.4 };
            nodes.push(
              <TransitionSeries.Transition
                key={`${scene.id}-trans`}
                presentation={getTransitionPresentation(transition)}
                timing={getTransitionTiming(transition, fps)}
              />,
            );
          }
          return nodes;
        })}
      </TransitionSeries>
      {spec.audio.voiceOver ? <Audio src={staticFile(spec.audio.voiceOver)} /> : null}
      {spec.audio.music ? <Audio src={staticFile(spec.audio.music)} volume={spec.audio.musicVolume} /> : null}
    </AbsoluteFill>
  );
};
