import { Composition, type CalculateMetadataFunction } from "remotion";
import { SAMPLE_SPEC } from "./sample-spec";
import { videoSpecSchema, type VideoSpec } from "./schemas/video-spec";
import { Video } from "./Video";

type Props = { spec: VideoSpec };

const calculateMetadata: CalculateMetadataFunction<Props> = ({ props }) => {
  const parsed = videoSpecSchema.parse(props.spec);
  const { width, height, fps, duration } = parsed.settings;
  return { width, height, fps, durationInFrames: Math.round(duration * fps), props: { spec: parsed } };
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Video"
    component={Video}
    durationInFrames={Math.round(SAMPLE_SPEC.settings.duration * SAMPLE_SPEC.settings.fps)}
    fps={SAMPLE_SPEC.settings.fps}
    width={SAMPLE_SPEC.settings.width}
    height={SAMPLE_SPEC.settings.height}
    defaultProps={{ spec: SAMPLE_SPEC }}
    calculateMetadata={calculateMetadata}
  />
);
