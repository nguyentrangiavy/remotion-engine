import { Img, staticFile } from "remotion";
import { SplitScreen } from "../layouts/SplitScreen";
import type { Scene, VideoSpec } from "../schemas/video-spec";
import { HeroText } from "../typography/HeroText";

type Side = Extract<Scene, { type: "split" }>["left"];

const SideContent: React.FC<{ side: Side; color: string }> = ({ side, color }) => {
  if (side.kind === "text") {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <HeroText color={color} style={{ fontSize: 44 }}>
          {side.content ?? ""}
        </HeroText>
      </div>
    );
  }
  // "image" và "video" đều hiển thị như ảnh tĩnh ở Round 1 — phát video thật trong SplitScene để Round sau.
  return <Img src={staticFile(side.src ?? "")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />;
};

export const SplitScene: React.FC<{ scene: Extract<Scene, { type: "split" }>; style: VideoSpec["style"] }> = ({
  scene,
  style,
}) => (
  <SplitScreen direction={scene.layout?.direction ?? "horizontal"} ratio={scene.layout?.ratio ?? 0.5}>
    <SideContent side={scene.left} color={style.primaryColor} />
    <SideContent side={scene.right} color={style.primaryColor} />
  </SplitScreen>
);
