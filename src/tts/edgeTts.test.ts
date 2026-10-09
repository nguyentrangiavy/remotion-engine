import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { durationMsFromMetadata, synthesizeNarration, type TtsClient } from "./edgeTts";

describe("durationMsFromMetadata", () => {
  it("converts .NET ticks (100ns) to milliseconds, taking the latest boundary end", () => {
    const items = [
      { Type: "WordBoundary", Data: { Offset: 0, Duration: 10_000_000 } }, // 1000ms
      { Type: "SentenceBoundary", Data: { Offset: 0, Duration: 36_500_000 } }, // 3650ms — câu mẫu đã verify thật
    ];
    expect(durationMsFromMetadata(items)).toBe(3650);
  });

  it("returns 0 for an empty metadata array", () => {
    expect(durationMsFromMetadata([])).toBe(0);
  });

  it("ignores items with no Data", () => {
    expect(durationMsFromMetadata([{ Type: "Weird" }])).toBe(0);
  });
});

describe("synthesizeNarration", () => {
  it("calls setMetadata with the voice, then toFile, and derives durationMs from the metadata file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "edge-tts-test-"));
    const calls: string[] = [];
    const fakeClient: TtsClient = {
      setMetadata: async (voice) => {
        calls.push(`setMetadata:${voice}`);
      },
      toFile: async (dirPath, text) => {
        calls.push(`toFile:${text}`);
        const audioFilePath = path.join(dirPath, "audio.mp3");
        const metadataFilePath = path.join(dirPath, "audio.json");
        await fs.writeFile(audioFilePath, "fake-mp3-bytes");
        await fs.writeFile(
          metadataFilePath,
          JSON.stringify({ Metadata: [{ Type: "SentenceBoundary", Data: { Offset: 0, Duration: 36_500_000 } }] }),
        );
        return { audioFilePath, metadataFilePath };
      },
    };

    const result = await synthesizeNarration(fakeClient, "Một engine, nhiều video là dữ liệu.", "vi-VN-HoaiMyNeural", dir);

    expect(calls).toEqual(["setMetadata:vi-VN-HoaiMyNeural", "toFile:Một engine, nhiều video là dữ liệu."]);
    expect(result.durationMs).toBe(3650);
    expect(result.audioFilePath).toBe(path.join(dir, "audio.mp3"));
  });

  it("throws clearly when Edge TTS returns no metadata file", async () => {
    const fakeClient: TtsClient = {
      setMetadata: async () => {},
      toFile: async (dirPath) => ({ audioFilePath: path.join(dirPath, "audio.mp3"), metadataFilePath: null }),
    };
    await expect(synthesizeNarration(fakeClient, "text", "voice", "/tmp")).rejects.toThrow(/metadata/i);
  });
});
