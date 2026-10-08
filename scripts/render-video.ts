import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { outputPath, specPath, videoDir } from "../src/engine/AssetResolver";
import { videoSpecSchema } from "../src/schemas/video-spec";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: npm run render <id>");
    process.exit(1);
  }
  const root = process.cwd();
  const raw = JSON.parse(await fs.readFile(specPath(root, id), "utf8"));
  const spec = videoSpecSchema.parse(raw);

  console.log(`[render] Đang bundle...`);
  const bundleLocation = await bundle({
    entryPoint: path.join(root, "src", "index.ts"),
    publicDir: videoDir(root, id), // assets/ trong spec resolve thẳng từ đây, không cần copy
  });

  console.log(`[render] Đang chọn composition...`);
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "Video",
    inputProps: { spec },
  });

  const out = outputPath(root, id);
  await fs.mkdir(path.dirname(out), { recursive: true });

  console.log(`[render] Đang render ${composition.durationInFrames} khung hình...`);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: out,
    inputProps: { spec },
    onProgress: ({ progress }) => {
      process.stdout.write(`\r[render] ${Math.round(progress * 100)}%`);
    },
  });
  process.stdout.write("\n");

  console.log(`[render] Xong: videos/${id}/output/video.mp4`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
