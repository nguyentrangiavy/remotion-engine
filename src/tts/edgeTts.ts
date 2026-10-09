import fs from "node:fs/promises";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export type EdgeBoundary = {
  Type?: string;
  Data?: { Offset: number; Duration: number };
};

export type TtsClient = {
  setMetadata(voiceName: string): Promise<void>;
  toFile(dirPath: string, text: string): Promise<{ audioFilePath: string; metadataFilePath: string | null }>;
};

export function createEdgeTtsClient(): TtsClient {
  const tts = new MsEdgeTTS();
  return {
    setMetadata: (voiceName) =>
      tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {
        wordBoundaryEnabled: true,
        sentenceBoundaryEnabled: true,
      }),
    toFile: (dirPath, text) => tts.toFile(dirPath, text),
  };
}

const TICKS_PER_MS = 10_000; // Edge TTS trả offset/duration theo tick .NET (100ns/tick)

/** Lấy mốc kết thúc trễ nhất trong mọi boundary (word + sentence) — chính xác hơn chỉ dựa từ cuối. */
export function durationMsFromMetadata(items: EdgeBoundary[]): number {
  let maxEndTicks = 0;
  for (const item of items) {
    const data = item.Data;
    if (!data) continue;
    const end = data.Offset + data.Duration;
    if (end > maxEndTicks) maxEndTicks = end;
  }
  return Math.round(maxEndTicks / TICKS_PER_MS);
}

export async function synthesizeNarration(
  client: TtsClient,
  text: string,
  voice: string,
  outDir: string,
): Promise<{ audioFilePath: string; metadataFilePath: string; durationMs: number }> {
  await client.setMetadata(voice);
  const { audioFilePath, metadataFilePath } = await client.toFile(outDir, text);
  if (!metadataFilePath) throw new Error("Edge TTS không trả metadata — không đo được thời lượng narration");

  const raw = JSON.parse(await fs.readFile(metadataFilePath, "utf8")) as { Metadata?: EdgeBoundary[] };
  const durationMs = durationMsFromMetadata(raw.Metadata ?? []);
  return { audioFilePath, metadataFilePath, durationMs };
}
