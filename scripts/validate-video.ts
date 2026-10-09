import fs from "node:fs/promises";
import { findMissingAssets, specPath } from "../src/engine/AssetResolver";
import { resolveAudio } from "../src/engine/AudioResolver";
import { videoSpecSchema } from "../src/schemas/video-spec";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: npm run validate <id>");
    process.exit(1);
  }
  const root = process.cwd();
  const file = specPath(root, id);

  let raw: unknown;
  try {
    raw = JSON.parse(await fs.readFile(file, "utf8"));
  } catch (err) {
    console.error(`ERROR:\nKhông đọc được ${file}: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  const result = videoSpecSchema.safeParse(raw);
  if (!result.success) {
    console.error("ERROR:\nSpec không hợp lệ:");
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    process.exit(1);
  }
  const spec = result.data;

  const totalSceneSeconds = spec.scenes.reduce((sum, s) => sum + s.duration, 0);
  if (Math.abs(totalSceneSeconds - spec.settings.duration) > 0.01) {
    console.error(
      `ERROR:\nVideo duration does not match timeline. settings.duration=${spec.settings.duration}s, tổng scenes=${totalSceneSeconds}s.`,
    );
    process.exit(1);
  }

  const missing = await findMissingAssets(root, id, spec);
  if (missing.length > 0) {
    console.error("ERROR:\nAsset not found:");
    for (const rel of missing) console.error(`  videos/${id}/${rel}`);
    process.exit(1);
  }

  console.log(`[validate] Đang sinh/kiểm tra audio (TTS/nhạc nền/SFX)...`);
  const resolved = await resolveAudio(root, id, spec);

  if (Math.abs(resolved.settings.duration - spec.settings.duration) > 0.01) {
    console.log(
      `[validate] Lưu ý: settings.duration gốc ${spec.settings.duration}s, sau khi tính narration thực tế: ${resolved.settings.duration}s (một số scene bị lời đọc kéo dài hơn khai báo).`,
    );
  }

  console.log(
    `[validate] ${id}: OK — ${resolved.scenes.length} scene(s), ${resolved.settings.duration}s, mọi asset đều có.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
