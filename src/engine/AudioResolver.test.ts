import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { TtsClient } from "../tts/edgeTts";
import type { VideoSpec } from "../schemas/video-spec";
import { adjustedSceneDuration, resolveAudio } from "./AudioResolver";
import { videoDir } from "./AssetResolver";

function makeFakeTtsClient(durationMs: number) {
  const toFile = vi.fn(async (dirPath: string, _text: string) => {
    const audioFilePath = path.join(dirPath, "audio.mp3");
    const metadataFilePath = path.join(dirPath, "audio.json");
    await fs.writeFile(audioFilePath, "fake-mp3-bytes");
    await fs.writeFile(
      metadataFilePath,
      JSON.stringify({ Metadata: [{ Type: "SentenceBoundary", Data: { Offset: 0, Duration: durationMs * 10_000 } }] }),
    );
    return { audioFilePath, metadataFilePath };
  });
  const client: TtsClient = { setMetadata: vi.fn(async () => {}), toFile };
  return client;
}

async function mkRoot(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "audio-resolver-test-"));
}

function baseSpec(overrides: Partial<VideoSpec> = {}): VideoSpec {
  return {
    version: "1.0",
    id: "demo",
    settings: { width: 1080, height: 1920, fps: 30, duration: 5 },
    style: { theme: "minimal", font: "Inter", primaryColor: "#fff", accentColor: "#7C5CFF", backgroundColor: "#000" },
    audio: { voice: "vi-VN-HoaiMyNeural", musicVolume: 0.15, sfx: true },
    scenes: [{ id: "s1", type: "text", duration: 5, text: { type: "hero", content: "Hi", position: "center" } }],
    ...overrides,
  };
}

describe("adjustedSceneDuration", () => {
  it("extends duration when narration is longer, with a 0.2s buffer rounded up to 0.1s", () => {
    expect(adjustedSceneDuration(3, 3650)).toBe(3.9); // verify thật: 3.65 + 0.2 = 3.85 -> ceil bậc 0.1 = 3.9
  });

  it("keeps the original duration when narration fits within it", () => {
    expect(adjustedSceneDuration(5, 2000)).toBe(5);
  });
});

describe("resolveAudio — narration", () => {
  it("generates TTS for a scene's narration and extends its duration to fit", async () => {
    const root = await mkRoot();
    const client = makeFakeTtsClient(3650);
    const spec = baseSpec({ scenes: [{ id: "s1", type: "text", duration: 3, narration: "Một câu dài hơn.", text: { type: "hero", content: "Hi", position: "center" } }] });

    const resolved = await resolveAudio(root, "demo", spec, { ttsClient: client });

    expect(resolved.scenes[0].duration).toBe(3.9);
    expect(resolved.scenes[0].narrationAudioPath).toMatch(/^assets\/generated\/tts-.+\.mp3$/);
    expect(resolved.settings.duration).toBe(3.9);
    expect(client.toFile).toHaveBeenCalledTimes(1);

    const audioAbsPath = path.join(videoDir(root, "demo"), resolved.scenes[0].narrationAudioPath!);
    await expect(fs.access(audioAbsPath)).resolves.toBeUndefined();
  });

  it("does not call the TTS client again on a second resolve with the same narration (cache hit)", async () => {
    const root = await mkRoot();
    const client = makeFakeTtsClient(1000);
    const spec = baseSpec({ scenes: [{ id: "s1", type: "text", duration: 5, narration: "Câu giống nhau.", text: { type: "hero", content: "Hi", position: "center" } }] });

    await resolveAudio(root, "demo", spec, { ttsClient: client });
    await resolveAudio(root, "demo", spec, { ttsClient: client });

    expect(client.toFile).toHaveBeenCalledTimes(1);
  });

  it("leaves scenes without narration untouched", async () => {
    const root = await mkRoot();
    const client = makeFakeTtsClient(1000);
    const spec = baseSpec();

    const resolved = await resolveAudio(root, "demo", spec, { ttsClient: client });

    expect(resolved.scenes[0].narrationAudioPath).toBeUndefined();
    expect(resolved.scenes[0].duration).toBe(5);
    expect(client.toFile).not.toHaveBeenCalled();
  });
});

describe("resolveAudio — music", () => {
  it("passes through a plain file path unchanged", async () => {
    const root = await mkRoot();
    const spec = baseSpec({ audio: { voice: "vi-VN-HoaiMyNeural", musicVolume: 0.15, sfx: true, music: "assets/music.mp3" } });

    const resolved = await resolveAudio(root, "demo", spec, { ttsClient: makeFakeTtsClient(0) });

    expect(resolved.audio.music).toBe("assets/music.mp3");
  });

  it("synthesizes and caches a music file when generate:true is used", async () => {
    const root = await mkRoot();
    const spec = baseSpec({ audio: { voice: "vi-VN-HoaiMyNeural", musicVolume: 0.15, sfx: true, music: { generate: true, mood: "ambient" } } });

    const resolved = await resolveAudio(root, "demo", spec, { ttsClient: makeFakeTtsClient(0) });

    expect(resolved.audio.music).toMatch(/^assets\/generated\/music-ambient-.+\.wav$/);
    const absPath = path.join(videoDir(root, "demo"), resolved.audio.music!);
    const stat = await fs.stat(absPath);
    expect(stat.size).toBeGreaterThan(44); // header WAV + ít nhất vài mẫu
  });
});

describe("resolveAudio — sfx", () => {
  it("generates one SFX file per distinct transition type used, skipping 'none'", async () => {
    const root = await mkRoot();
    const spec = baseSpec({
      scenes: [
        { id: "s1", type: "text", duration: 2, text: { type: "hero", content: "A", position: "center" } },
        { id: "s2", type: "text", duration: 2, text: { type: "hero", content: "B", position: "center" }, transition: { type: "slide", duration: 0.4 } },
        { id: "s3", type: "text", duration: 2, text: { type: "hero", content: "C", position: "center" }, transition: { type: "none", duration: 0.4 } },
      ],
      settings: { width: 1080, height: 1920, fps: 30, duration: 6 },
    });

    const resolved = await resolveAudio(root, "demo", spec, { ttsClient: makeFakeTtsClient(0) });

    expect(Object.keys(resolved.audio.sfxPaths)).toEqual(["slide"]);
    expect(resolved.audio.sfxPaths.slide).toMatch(/^assets\/generated\/sfx-slide\.wav$/);
  });

  it("generates nothing when audio.sfx is false", async () => {
    const root = await mkRoot();
    const spec = baseSpec({
      scenes: [
        { id: "s1", type: "text", duration: 2, text: { type: "hero", content: "A", position: "center" } },
        { id: "s2", type: "text", duration: 2, text: { type: "hero", content: "B", position: "center" }, transition: { type: "slide", duration: 0.4 } },
      ],
      audio: { voice: "vi-VN-HoaiMyNeural", musicVolume: 0.15, sfx: false },
      settings: { width: 1080, height: 1920, fps: 30, duration: 4 },
    });

    const resolved = await resolveAudio(root, "demo", spec, { ttsClient: makeFakeTtsClient(0) });

    expect(resolved.audio.sfxPaths).toEqual({});
  });
});
