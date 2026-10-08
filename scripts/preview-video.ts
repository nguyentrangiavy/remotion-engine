import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { specPath } from "../src/engine/AssetResolver";
import { videoSpecSchema } from "../src/schemas/video-spec";

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: npm run preview <id>");
    process.exit(1);
  }
  const root = process.cwd();
  const raw = JSON.parse(await fs.readFile(specPath(root, id), "utf8"));
  const spec = videoSpecSchema.parse(raw); // ném lỗi rõ ràng nếu spec sai — chạy `npm run validate <id>` trước nếu cần chi tiết hơn

  const propsFile = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "remotion-engine-preview-")), "props.json");
  await fs.writeFile(propsFile, JSON.stringify({ spec }));

  console.log(`[preview] Mở Remotion Studio cho videos/${id}/ (publicDir = videos/${id}/)...`);
  const child = spawn(
    "npx",
    ["remotion", "studio", "src/index.ts", `--props=${propsFile}`, `--public-dir=videos/${id}`],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
