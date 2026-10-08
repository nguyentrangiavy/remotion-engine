import fs from "node:fs/promises";
import path from "node:path";
import { assetsDir, specPath, videoDir } from "../src/engine/AssetResolver";

const SAMPLE: object = {
  version: "1.0",
  id: "REPLACE_ME",
  settings: { width: 1080, height: 1920, fps: 30, duration: 5 },
  style: {},
  audio: {},
  scenes: [{ id: "s1", type: "image", duration: 5, src: "assets/scene-01.png" }],
};

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: npm run create-video <id>");
    process.exit(1);
  }
  const root = process.cwd();
  const dir = videoDir(root, id);
  try {
    await fs.access(dir);
    console.error(`Lỗi: videos/${id}/ đã tồn tại.`);
    process.exit(1);
  } catch {
    // chưa tồn tại — đúng như mong đợi
  }

  await fs.mkdir(assetsDir(root, id), { recursive: true });
  await fs.mkdir(path.join(dir, "output"), { recursive: true });
  const spec = { ...SAMPLE, id };
  await fs.writeFile(specPath(root, id), JSON.stringify(spec, null, 2));

  console.log(`Đã tạo videos/${id}/`);
  console.log(`  - video-spec.json (mẫu 1 scene ảnh — sửa lại cho đúng ý bạn)`);
  console.log(`  - assets/ (bỏ ảnh/video/âm thanh vào đây)`);
  console.log(`Tiếp theo: bỏ ảnh thật vào assets/scene-01.png rồi chạy: npm run validate ${id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
