import { Img, staticFile } from "remotion";
import { Grid } from "../layouts/Grid";
import type { Scene, VideoSpec } from "../schemas/video-spec";

export const GridScene: React.FC<{ scene: Extract<Scene, { type: "grid" }>; style: VideoSpec["style"] }> = ({
  scene,
}) => (
  <Grid columns={scene.layout?.columns ?? 2}>
    {scene.items.map((item, i) => (
      <Img key={i} src={staticFile(item.src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    ))}
  </Grid>
);
