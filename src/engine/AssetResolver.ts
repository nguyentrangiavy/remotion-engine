import fs from "node:fs/promises";
import path from "node:path";
import type { VideoSpec } from "../schemas/video-spec";

export function videoDir(root: string, id: string): string {
  return path.join(root, "videos", id);
}

export function assetsDir(root: string, id: string): string {
  return path.join(videoDir(root, id), "assets");
}

export function specPath(root: string, id: string): string {
  return path.join(videoDir(root, id), "video-spec.json");
}

export function outputPath(root: string, id: string): string {
  return path.join(videoDir(root, id), "output", "video.mp4");
}

/** Mọi đường dẫn asset (ảnh/video) mà spec tham chiếu, theo thứ tự xuất hiện: audio trước, rồi từng scene. */
export function collectAssetPaths(spec: VideoSpec): string[] {
  const paths: string[] = [];
  if (spec.audio.voiceOver) paths.push(spec.audio.voiceOver);
  if (typeof spec.audio.music === "string") paths.push(spec.audio.music); // {generate:true,...} tự sinh, không phải asset cần kiểm tra tồn tại

  for (const scene of spec.scenes) {
    if (scene.type === "image" || scene.type === "video" || scene.type === "deviceFrame") {
      paths.push(scene.src);
    } else if (scene.type === "split") {
      if (scene.left.src) paths.push(scene.left.src);
      if (scene.right.src) paths.push(scene.right.src);
    } else if (scene.type === "grid") {
      for (const item of scene.items) paths.push(item.src);
    }
  }
  return paths;
}

export async function findMissingAssets(root: string, id: string, spec: VideoSpec): Promise<string[]> {
  const dir = videoDir(root, id);
  const missing: string[] = [];
  for (const rel of collectAssetPaths(spec)) {
    try {
      await fs.access(path.join(dir, rel));
    } catch {
      missing.push(rel);
    }
  }
  return missing;
}
