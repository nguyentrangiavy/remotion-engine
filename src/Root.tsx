import { Composition } from "remotion";

const Placeholder: React.FC = () => null;

export const RemotionRoot: React.FC = () => (
  <Composition id="Video" component={Placeholder} durationInFrames={30} fps={30} width={1080} height={1920} />
);
