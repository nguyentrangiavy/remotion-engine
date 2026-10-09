import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { synthesizeMusic } from "../audio/synthesizeMusic";
import { synthesizeSfx } from "../audio/synthesizeSfx";
import { encodeWav } from "../audio/wav";
import type { Scene, TransitionConfig, VideoSpec } from "../schemas/video-spec";
import { createEdgeTtsClient, durationMsFromMetadata, synthesizeNarration, type EdgeBoundary, type TtsClient } from "../tts/edgeTts";
import { videoDir } from "./AssetResolver";

export type ResolvedScene = Scene & { narrationAudioPath?: string };
export type ResolvedVideoSpec = Omit<VideoSpec, "scenes" | "audio"> & {
  scenes: ResolvedScene[];
  audio: Omit<VideoSpec["audio"], "music"> & {
    music?: string;
    sfxPaths: Partial<Record<TransitionConfig["type"], string>>;
  };
};

export type AudioResolverDeps = { ttsClient?: TtsClient };

const SAMPLE_RATE = 44100;
const DEFAULT_TRANSITION: TransitionConfig = { type: "fade", duration: 0.4 };

function cacheKey(...parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 12);
}

/** Nâng duration khi narration dài hơn khai báo — đệm 0.2s cuối câu, làm tròn lên bậc 0.1s. */
export function adjustedSceneDuration(originalDuration: number, narrationDurationMs: number): number {
  const narrationSec = narrationDurationMs / 1000;
  const buffered = Math.ceil((narrationSec + 0.2) * 10) / 10;
  return Math.max(originalDuration, buffered);
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveNarrationForScene(
  dir: string,
  narration: string,
  voice: string,
  ttsClient: TtsClient,
): Promise<{ audioRelPath: string; durationMs: number }> {
  const key = cacheKey("tts", narration, voice);
  const generatedDir = path.join(dir, "assets", "generated");
  const audioAbsPath = path.join(generatedDir, `tts-${key}.mp3`);
  const metaAbsPath = path.join(generatedDir, `tts-${key}.json`);
  const audioRelPath = `assets/generated/tts-${key}.mp3`;

  await fs.mkdir(generatedDir, { recursive: true });

  if ((await fileExists(audioAbsPath)) && (await fileExists(metaAbsPath))) {
    const raw = JSON.parse(await fs.readFile(metaAbsPath, "utf8")) as { Metadata?: EdgeBoundary[] };
    return { audioRelPath, durationMs: durationMsFromMetadata(raw.Metadata ?? []) };
  }

  const { audioFilePath, metadataFilePath, durationMs } = await synthesizeNarration(ttsClient, narration, voice, generatedDir);
  await fs.rename(audioFilePath, audioAbsPath);
  await fs.rename(metadataFilePath, metaAbsPath);
  return { audioRelPath, durationMs };
}

export async function resolveAudio(
  root: string,
  id: string,
  spec: VideoSpec,
  deps: AudioResolverDeps = {},
): Promise<ResolvedVideoSpec> {
  const dir = videoDir(root, id);
  const ttsClient = deps.ttsClient ?? createEdgeTtsClient();

  const resolvedScenes: ResolvedScene[] = [];
  for (const scene of spec.scenes) {
    if (!scene.narration) {
      resolvedScenes.push({ ...scene });
      continue;
    }
    const { audioRelPath, durationMs } = await resolveNarrationForScene(dir, scene.narration, spec.audio.voice, ttsClient);
    resolvedScenes.push({
      ...scene,
      duration: adjustedSceneDuration(scene.duration, durationMs),
      narrationAudioPath: audioRelPath,
    });
  }

  const totalDuration = resolvedScenes.reduce((sum, s) => sum + s.duration, 0);

  let musicPath: string | undefined;
  if (spec.audio.music) {
    if (typeof spec.audio.music === "string") {
      musicPath = spec.audio.music;
    } else {
      const { mood } = spec.audio.music;
      const durationSec = Math.round(totalDuration * 10) / 10;
      const relPath = `assets/generated/music-${mood}-${durationSec}.wav`;
      const absPath = path.join(dir, relPath);
      if (!(await fileExists(absPath))) {
        await fs.mkdir(path.dirname(absPath), { recursive: true });
        const samples = synthesizeMusic(mood, durationSec, SAMPLE_RATE);
        await fs.writeFile(absPath, encodeWav(samples, SAMPLE_RATE));
      }
      musicPath = relPath;
    }
  }

  const sfxPaths: Partial<Record<TransitionConfig["type"], string>> = {};
  if (spec.audio.sfx) {
    for (let i = 0; i < spec.scenes.length - 1; i++) {
      const transition = spec.scenes[i + 1].transition ?? DEFAULT_TRANSITION;
      if (transition.type === "none" || sfxPaths[transition.type]) continue;
      const relPath = `assets/generated/sfx-${transition.type}.wav`;
      const absPath = path.join(dir, relPath);
      if (!(await fileExists(absPath))) {
        await fs.mkdir(path.dirname(absPath), { recursive: true });
        const samples = synthesizeSfx(transition.type, SAMPLE_RATE);
        await fs.writeFile(absPath, encodeWav(samples, SAMPLE_RATE));
      }
      sfxPaths[transition.type] = relPath;
    }
  }

  return {
    ...spec,
    settings: { ...spec.settings, duration: totalDuration },
    scenes: resolvedScenes,
    audio: { ...spec.audio, music: musicPath, sfxPaths },
  };
}
