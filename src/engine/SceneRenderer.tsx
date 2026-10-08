import type { Scene, VideoSpec } from "../schemas/video-spec";
import { CodeScene } from "../scenes/CodeScene";
import { DeviceFrameScene } from "../scenes/DeviceFrameScene";
import { GridScene } from "../scenes/GridScene";
import { ImageScene } from "../scenes/ImageScene";
import { QuoteScene } from "../scenes/QuoteScene";
import { SplitScene } from "../scenes/SplitScene";
import { TextScene } from "../scenes/TextScene";
import { VideoScene } from "../scenes/VideoScene";

export const SceneRenderer: React.FC<{ scene: Scene; style: VideoSpec["style"] }> = ({ scene, style }) => {
  switch (scene.type) {
    case "image":
      return <ImageScene scene={scene} style={style} />;
    case "video":
      return <VideoScene scene={scene} style={style} />;
    case "text":
      return <TextScene scene={scene} style={style} />;
    case "split":
      return <SplitScene scene={scene} style={style} />;
    case "deviceFrame":
      return <DeviceFrameScene scene={scene} style={style} />;
    case "grid":
      return <GridScene scene={scene} style={style} />;
    case "code":
      return <CodeScene scene={scene} style={style} />;
    case "quote":
      return <QuoteScene scene={scene} style={style} />;
    default: {
      const exhaustive: never = scene;
      throw new Error(`Unknown scene type: ${JSON.stringify(exhaustive)}`);
    }
  }
};
