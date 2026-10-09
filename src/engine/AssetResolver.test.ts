import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { VideoSpec } from "../schemas/video-spec";
import { collectAssetPaths, findMissingAssets, outputPath, specPath, videoDir } from "./AssetResolver";

const spec: VideoSpec = {
  version: "1.0",
  id: "demo",
  settings: { width: 1080, height: 1920, fps: 30, duration: 10 },
  style: { theme: "minimal", font: "Inter", primaryColor: "#fff", accentColor: "#7C5CFF", backgroundColor: "#000" },
  audio: { voiceOver: "assets/voice.mp3", voice: "vi-VN-HoaiMyNeural", music: "assets/music.mp3", musicVolume: 0.15, sfx: true },
  scenes: [
    { id: "s1", type: "image", duration: 5, src: "assets/a.png" },
    {
      id: "s2",
      type: "split",
      duration: 5,
      left: { kind: "image", src: "assets/b.png" },
      right: { kind: "text", content: "hi" },
    },
    { id: "s3", type: "grid", duration: 5, items: [{ src: "assets/c.png" }, { src: "assets/d.png" }] },
  ],
};

describe("videoDir / specPath / outputPath", () => {
  it("joins root/videos/<id> and its sub-paths", () => {
    expect(videoDir("/root", "demo")).toBe(path.join("/root", "videos", "demo"));
    expect(specPath("/root", "demo")).toBe(path.join("/root", "videos", "demo", "video-spec.json"));
    expect(outputPath("/root", "demo")).toBe(path.join("/root", "videos", "demo", "output", "video.mp4"));
  });
});

describe("collectAssetPaths", () => {
  it("collects audio + every scene's image/video/split/grid src, skipping text-only sides", () => {
    expect(collectAssetPaths(spec)).toEqual([
      "assets/voice.mp3",
      "assets/music.mp3",
      "assets/a.png",
      "assets/b.png",
      "assets/c.png",
      "assets/d.png",
    ]);
  });
});

describe("findMissingAssets", () => {
  it("reports only the paths that don't exist on disk", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "re-assets-"));
    const dir = videoDir(root, "demo");
    await fs.mkdir(path.join(dir, "assets"), { recursive: true });
    await fs.writeFile(path.join(dir, "assets", "a.png"), "x");
    await fs.writeFile(path.join(dir, "assets", "voice.mp3"), "x");

    const missing = await findMissingAssets(root, "demo", spec);
    expect(missing.sort()).toEqual(["assets/b.png", "assets/c.png", "assets/d.png", "assets/music.mp3"].sort());
  });

  it("returns an empty array when every asset exists", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "re-assets-"));
    const dir = videoDir(root, "demo");
    await fs.mkdir(path.join(dir, "assets"), { recursive: true });
    for (const rel of collectAssetPaths(spec)) {
      await fs.writeFile(path.join(dir, rel), "x");
    }
    expect(await findMissingAssets(root, "demo", spec)).toEqual([]);
  });
});
