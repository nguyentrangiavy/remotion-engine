# remotion-engine Round 2 — Audio Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tự sinh giọng đọc (TTS), nhạc nền, và SFX cho `remotion-engine` — lấp khoảng trống Round 1 (video demo "nền đen, không SFX, không TTS") mà không cần người dùng tự thu âm/tìm nhạc trước.

**Architecture:** Một module Node-only mới `engine/AudioResolver.ts` nhận spec gốc, gọi Edge TTS cho `narration` từng scene (cache theo hash nội dung+voice), tự synth nhạc nền/SFX bằng sóng sine/noise thuần code (cache theo mood/type), và tự nâng `scene.duration` khi lời đọc dài hơn khai báo — trả về `ResolvedVideoSpec` (mọi path audio là file thật, mọi duration đã khớp). Ba script CLI (`validate`/`preview`/`render`) gọi `resolveAudio()` ngay sau khi parse spec; `Video.tsx`/`Root.tsx` chỉ còn việc đọc spec đã resolve, không tự sinh gì. Giữ đúng ranh giới: logic thuần (hash, tính duration, buffer WAV, dispatch theo mood/type) có unit test; "nghe có hay không" verify bằng render + nghe thật.

**Tech Stack:** `msedge-tts` (TTS Edge, đã dùng và verify thật ở `short-video-engine`), Node `crypto`/`fs` core (WAV tự encode, không cần thư viện audio ngoài), Vitest.

**Phụ thuộc:** [Spec thiết kế](../specs/2026-10-09-remotion-engine-round2-audio-design.md) — đọc trước khi implement, đặc biệt §12 (các điểm đã verify thật: tên giọng `vi-VN-HoaiMyNeural`/`vi-VN-NamMinhNeural` tồn tại thật, `msedge-tts`'s `toFile()` trả `metadataFilePath` chứa `durationMs` chính xác — không cần thư viện đo duration riêng).

---

## Task 1: Thêm dependency `msedge-tts`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Thêm dependency**

Trong `package.json`, key `"dependencies"`, thêm (giữ thứ tự alphabet như các key khác):

```json
    "msedge-tts": "2.0.9",
```

- [ ] **Step 2: Cài và xác nhận**

```bash
npm install
npm run typecheck
```

Expected: cả hai lệnh chạy sạch, không lỗi.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add msedge-tts for Round 2 audio pipeline"
```

---

## Task 2: Schema — thêm `narration`, `audio.voice`, `audio.music` (union), `audio.sfx`

**Files:**
- Modify: `src/schemas/video-spec.ts`
- Modify: `src/schemas/video-spec.test.ts`
- Modify: `src/sample-spec.ts` (phải cập nhật — `audioSchema` thêm 2 field required-after-default mới)

- [ ] **Step 1: Thêm test cho các field mới**

Thêm vào cuối `describe("videoSpecSchema", ...)` trong `src/schemas/video-spec.test.ts`:

```ts
  it("accepts a scene with narration independent of displayed text", () => {
    const spec = { ...base, scenes: [{ ...base.scenes[0], narration: "Lời đọc khác với chữ hiển thị." }] };
    const result = videoSpecSchema.parse(spec);
    expect(result.scenes[0]).toMatchObject({ narration: "Lời đọc khác với chữ hiển thị." });
  });

  it("defaults audio.voice and audio.sfx when audio is omitted entirely", () => {
    const result = videoSpecSchema.parse(base);
    expect(result.audio.voice).toBe("vi-VN-HoaiMyNeural");
    expect(result.audio.sfx).toBe(true);
  });

  it("accepts audio.music as a plain file path (Round 1 behavior unchanged)", () => {
    const spec = { ...base, audio: { music: "assets/music.mp3" } };
    const result = videoSpecSchema.parse(spec);
    expect(result.audio.music).toBe("assets/music.mp3");
  });

  it("accepts audio.music as a generate directive with a mood", () => {
    const spec = { ...base, audio: { music: { generate: true, mood: "ambient" } } };
    const result = videoSpecSchema.parse(spec);
    expect(result.audio.music).toEqual({ generate: true, mood: "ambient" });
  });

  it("rejects audio.music.generate with an unknown mood", () => {
    const spec = { ...base, audio: { music: { generate: true, mood: "epic" } } };
    expect(() => videoSpecSchema.parse(spec)).toThrow();
  });

  it("allows turning off auto-SFX via audio.sfx: false", () => {
    const spec = { ...base, audio: { sfx: false } };
    const result = videoSpecSchema.parse(spec);
    expect(result.audio.sfx).toBe(false);
  });
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- video-spec`
Expected: FAIL — các field `narration`/`voice`/`sfx` chưa tồn tại trong schema, assertion không khớp giá trị mong đợi (vd. `result.audio.voice` là `undefined` thay vì `"vi-VN-HoaiMyNeural"`), và test "generate directive"/"unknown mood" fail vì `music` hiện chỉ nhận string.

- [ ] **Step 3: Sửa `src/schemas/video-spec.ts`**

Thêm field `narration` vào `sceneBaseSchema`:

```ts
const sceneBaseSchema = z.object({
  id: z.string(),
  duration: z.number().positive(),
  narration: z.string().optional(),
  layout: layoutSchema.optional(),
  animation: animationSchema.optional(),
  transition: transitionSchema.optional(),
});
```

Thay toàn bộ `audioSchema` (ngay phía trên `export const layoutSchema`):

```ts
const musicGenerateSchema = z.object({
  generate: z.literal(true),
  mood: z.enum(["ambient", "upbeat", "tense", "calm"]),
});

const audioSchema = z.object({
  voiceOver: z.string().optional(),
  voice: z.string().default("vi-VN-HoaiMyNeural"),
  music: z.union([z.string(), musicGenerateSchema]).optional(),
  musicVolume: z.number().min(0).max(1).default(0.15),
  sfx: z.boolean().default(true),
});
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npm test -- video-spec`
Expected: PASS.

- [ ] **Step 5: Cập nhật `src/sample-spec.ts` cho khớp schema mới**

Zod field có `.default()` trở thành **required** trong type output (`z.infer`) — `audioSchema` giờ có thêm `voice`/`sfx` required. Sửa `src/sample-spec.ts`:

```ts
  audio: { musicVolume: 0.15 },
```

thành:

```ts
  audio: { musicVolume: 0.15, voice: "vi-VN-HoaiMyNeural", sfx: true },
```

- [ ] **Step 6: Typecheck toàn repo**

Run: `npm run typecheck`
Expected: sạch. Nếu còn lỗi ở `Root.tsx` liên quan `audio` thiếu field — đó là vì Task 11 chưa làm, bỏ qua lỗi đó ở bước này nếu có (sẽ hết sau Task 11); nếu lỗi nằm ở chỗ khác ngoài Root.tsx/Video.tsx, phải sửa ngay.

- [ ] **Step 7: Commit**

```bash
git add src/schemas/video-spec.ts src/schemas/video-spec.test.ts src/sample-spec.ts
git commit -m "feat(schema): narration per scene, audio.voice, audio.music generate directive, audio.sfx"
```

---

## Task 3: `src/audio/wav.ts` — encode PCM 16-bit mono WAV

**Files:**
- Create: `src/audio/wav.ts`
- Test: `src/audio/wav.test.ts`

- [ ] **Step 1: Viết test**

```ts
// src/audio/wav.test.ts
import { describe, expect, it } from "vitest";
import { encodeWav } from "./wav";

describe("encodeWav", () => {
  it("writes a valid RIFF/WAVE header with the correct chunk sizes", () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1]);
    const buffer = encodeWav(samples, 44100);

    expect(buffer.toString("ascii", 0, 4)).toBe("RIFF");
    expect(buffer.toString("ascii", 8, 12)).toBe("WAVE");
    expect(buffer.toString("ascii", 12, 16)).toBe("fmt ");
    expect(buffer.toString("ascii", 36, 40)).toBe("data");
    expect(buffer.readUInt32LE(24)).toBe(44100); // sample rate
    expect(buffer.readUInt16LE(34)).toBe(16); // bits per sample
    expect(buffer.readUInt32LE(40)).toBe(samples.length * 2); // data chunk size
    expect(buffer.length).toBe(44 + samples.length * 2);
  });

  it("clamps out-of-range samples instead of overflowing", () => {
    const buffer = encodeWav(new Float32Array([2, -2]), 44100);
    expect(buffer.readInt16LE(44)).toBe(32767);
    expect(buffer.readInt16LE(46)).toBe(-32768);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- audio/wav`
Expected: FAIL — `Cannot find module './wav'`.

- [ ] **Step 3: Viết implementation**

```ts
// src/audio/wav.ts
export function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const byteRate = sampleRate * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16); // kích thước chunk fmt
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(bytesPerSample, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const intValue = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
    buffer.writeInt16LE(intValue, 44 + i * 2);
  }

  return buffer;
}
```

(Dùng `*32768` cho giá trị âm và `*32767` cho giá trị dương — đúng cách quy đổi PCM 16-bit chuẩn, tránh lệch biên độ giữa 2 phía.)

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npm test -- audio/wav`
Expected: PASS, 2 test.

- [ ] **Step 5: Commit**

```bash
git add src/audio/wav.ts src/audio/wav.test.ts
git commit -m "feat(audio): encodeWav — pure PCM16 mono WAV encoder, no external deps"
```

---

## Task 4: `src/audio/synthesizeMusic.ts` — nhạc nền 4 mood

**Files:**
- Create: `src/audio/synthesizeMusic.ts`
- Test: `src/audio/synthesizeMusic.test.ts`

- [ ] **Step 1: Viết test**

```ts
// src/audio/synthesizeMusic.test.ts
import { describe, expect, it } from "vitest";
import { synthesizeMusic, type Mood } from "./synthesizeMusic";

const MOODS: Mood[] = ["ambient", "upbeat", "tense", "calm"];
const SAMPLE_RATE = 44100;

describe("synthesizeMusic", () => {
  it.each(MOODS)("returns samples of the exact requested length for mood '%s'", (mood) => {
    const samples = synthesizeMusic(mood, 2, SAMPLE_RATE);
    expect(samples.length).toBe(Math.round(2 * SAMPLE_RATE));
  });

  it.each(MOODS)("keeps every sample within [-1, 1] for mood '%s'", (mood) => {
    const samples = synthesizeMusic(mood, 1.5, SAMPLE_RATE);
    for (const s of samples) {
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it.each(MOODS)("fades in and out so the first and last samples are near silence for mood '%s'", (mood) => {
    const samples = synthesizeMusic(mood, 3, SAMPLE_RATE);
    expect(Math.abs(samples[0])).toBeLessThan(0.01);
    expect(Math.abs(samples[samples.length - 1])).toBeLessThan(0.01);
  });

  it("produces different waveforms for different moods (not just a constant)", () => {
    const ambient = synthesizeMusic("ambient", 1, SAMPLE_RATE);
    const tense = synthesizeMusic("tense", 1, SAMPLE_RATE);
    expect(ambient).not.toEqual(tense);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- synthesizeMusic`
Expected: FAIL — `Cannot find module './synthesizeMusic'`.

- [ ] **Step 3: Viết implementation**

```ts
// src/audio/synthesizeMusic.ts
export type Mood = "ambient" | "upbeat" | "tense" | "calm";

function sine(freqHz: number, t: number): number {
  return Math.sin(2 * Math.PI * freqHz * t);
}

export function synthesizeMusic(mood: Mood, durationSec: number, sampleRate: number): Float32Array {
  const n = Math.round(durationSec * sampleRate);
  const out = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let v = 0;
    switch (mood) {
      case "ambient": {
        const lfo = 0.5 + 0.5 * sine(0.1, t);
        v = 0.15 * lfo * (sine(110, t) + sine(165, t));
        break;
      }
      case "calm": {
        const lfo = 0.5 + 0.5 * sine(0.05, t);
        v = 0.2 * lfo * sine(130, t);
        break;
      }
      case "upbeat": {
        const lfo = 0.5 + 0.5 * sine(0.1, t);
        const pad = 0.12 * lfo * (sine(110, t) + sine(165, t));
        const beatPhase = (t * 2) % 1; // 120 BPM = 2 phách/giây
        const pulse = beatPhase < 0.1 ? 1 - beatPhase / 0.1 : 0;
        v = pad + 0.25 * pulse * sine(220, t);
        break;
      }
      case "tense": {
        const tremolo = 0.5 + 0.5 * sine(4, t);
        v = 0.15 * tremolo * (sine(110, t) + sine(116.5, t)); // lệch nửa cung tạo phách khó chịu nhẹ
        break;
      }
    }
    out[i] = v;
  }

  const fadeSamples = Math.min(n, Math.round(0.3 * sampleRate));
  for (let i = 0; i < fadeSamples; i++) {
    const ratio = i / fadeSamples;
    out[i] *= ratio;
    out[n - 1 - i] *= ratio;
  }

  return out;
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npm test -- synthesizeMusic`
Expected: PASS, 9 test (`it.each` × 3 nhóm × 4 mood = 12 sub-case, cộng 1 test "khác mood" — tổng số test case thực tế do Vitest đếm, không cần khớp số chính xác, chỉ cần toàn bộ PASS).

- [ ] **Step 5: Commit**

```bash
git add src/audio/synthesizeMusic.ts src/audio/synthesizeMusic.test.ts
git commit -m "feat(audio): synthesizeMusic — 4 procedural ambient moods, no copyrighted audio"
```

---

## Task 5: `src/audio/synthesizeSfx.ts` — SFX theo loại transition

**Files:**
- Create: `src/audio/synthesizeSfx.ts`
- Test: `src/audio/synthesizeSfx.test.ts`

- [ ] **Step 1: Viết test**

```ts
// src/audio/synthesizeSfx.test.ts
import { describe, expect, it } from "vitest";
import { SFX_DURATION_SEC, synthesizeSfx, type SfxType } from "./synthesizeSfx";

const TYPES: SfxType[] = ["fade", "slide", "wipe", "zoom", "blur"];
const SAMPLE_RATE = 44100;

describe("synthesizeSfx", () => {
  it.each(TYPES)("returns samples matching SFX_DURATION_SEC for type '%s'", (type) => {
    const samples = synthesizeSfx(type, SAMPLE_RATE);
    expect(samples.length).toBe(Math.round(SFX_DURATION_SEC[type] * SAMPLE_RATE));
  });

  it.each(TYPES)("keeps every sample within [-1, 1] for type '%s'", (type) => {
    const samples = synthesizeSfx(type, SAMPLE_RATE);
    for (const s of samples) {
      expect(s).toBeGreaterThanOrEqual(-1);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it.each(TYPES)("has a bell-shaped envelope — near silence at both edges for type '%s'", (type) => {
    const samples = synthesizeSfx(type, SAMPLE_RATE);
    expect(Math.abs(samples[0])).toBeLessThan(0.05);
    expect(Math.abs(samples[samples.length - 1])).toBeLessThan(0.05);
  });

  it("every duration in SFX_DURATION_SEC is between 0.2s and 0.6s", () => {
    for (const type of TYPES) {
      expect(SFX_DURATION_SEC[type]).toBeGreaterThanOrEqual(0.2);
      expect(SFX_DURATION_SEC[type]).toBeLessThanOrEqual(0.6);
    }
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- synthesizeSfx`
Expected: FAIL — `Cannot find module './synthesizeSfx'`.

- [ ] **Step 3: Viết implementation**

```ts
// src/audio/synthesizeSfx.ts
export type SfxType = "fade" | "slide" | "wipe" | "zoom" | "blur";

export const SFX_DURATION_SEC: Record<SfxType, number> = {
  fade: 0.4,
  slide: 0.35,
  wipe: 0.3,
  zoom: 0.3,
  blur: 0.4,
};

function bellEnvelope(progress: number): number {
  return Math.sin(Math.PI * progress); // 0 ở 2 đầu, 1 ở giữa
}

function noise(): number {
  return Math.random() * 2 - 1;
}

export function synthesizeSfx(type: SfxType, sampleRate: number): Float32Array {
  const durationSec = SFX_DURATION_SEC[type];
  const n = Math.round(durationSec * sampleRate);
  const out = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const progress = n <= 1 ? 1 : i / (n - 1);
    const envelope = bellEnvelope(progress);
    let v = 0;
    switch (type) {
      case "fade":
        v = envelope * Math.sin(2 * Math.PI * 440 * t);
        break;
      case "slide":
        v = envelope * noise() * 0.6;
        break;
      case "wipe":
        v = (progress < 0.3 ? 1 : envelope) * noise() * 0.5;
        break;
      case "zoom": {
        const freq = 300 + progress * 900; // quét pitch thấp lên cao
        v = envelope * Math.sin(2 * Math.PI * freq * t);
        break;
      }
      case "blur":
        v = envelope * noise() * 0.25;
        break;
    }
    out[i] = v;
  }

  return out;
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npm test -- synthesizeSfx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/audio/synthesizeSfx.ts src/audio/synthesizeSfx.test.ts
git commit -m "feat(audio): synthesizeSfx — 5 short procedural SFX, one per transition type"
```

---

## Task 6: `src/tts/edgeTts.ts` — wrapper Edge TTS + đọc duration từ metadata

**Files:**
- Create: `src/tts/edgeTts.ts`
- Test: `src/tts/edgeTts.test.ts`

- [ ] **Step 1: Viết test**

```ts
// src/tts/edgeTts.test.ts
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
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- edgeTts`
Expected: FAIL — `Cannot find module './edgeTts'`.

- [ ] **Step 3: Viết implementation**

```ts
// src/tts/edgeTts.ts
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
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npm test -- edgeTts`
Expected: PASS, 5 test.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: sạch.

- [ ] **Step 6: Commit**

```bash
git add src/tts/edgeTts.ts src/tts/edgeTts.test.ts
git commit -m "feat(tts): Edge TTS wrapper — inject TtsClient for tests, exact duration from metadata"
```

---

## Task 7: `engine/AudioResolver.ts` — ghép TTS + nhạc nền + SFX + chỉnh duration

**Files:**
- Create: `src/engine/AudioResolver.ts`
- Test: `src/engine/AudioResolver.test.ts`

- [ ] **Step 1: Viết test**

```ts
// src/engine/AudioResolver.test.ts
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
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `npm test -- AudioResolver`
Expected: FAIL — `Cannot find module './AudioResolver'`.

- [ ] **Step 3: Viết implementation**

```ts
// src/engine/AudioResolver.ts
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
```

(Vòng lặp narration chạy **tuần tự**, `await` từng scene — không `Promise.all` — vì `msedge-tts`'s `toFile()` luôn ghi file tên cố định `audio.mp3`/`audio.json` vào `generatedDir`; chạy song song sẽ ghi đè lẫn nhau trước khi kịp `rename`. Đã verify tên file cố định này bằng lệnh thật lúc viết plan.)

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `npm test -- AudioResolver`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: sạch.

- [ ] **Step 6: Commit**

```bash
git add src/engine/AudioResolver.ts src/engine/AudioResolver.test.ts
git commit -m "feat(engine): AudioResolver — TTS + music + SFX generation, cache, duration adjustment"
```

---

## Task 8: CLI — `validate-video.ts` gọi `resolveAudio`

**Files:**
- Modify: `scripts/validate-video.ts`

- [ ] **Step 1: Sửa file**

Thêm import và gọi `resolveAudio` sau khi đã qua mọi check cũ (schema, duration-khớp-spec-gốc, asset có sẵn) — rồi in thêm dòng thông báo nếu duration bị điều chỉnh do narration:

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sạch.

- [ ] **Step 3: Commit**

```bash
git add scripts/validate-video.ts
git commit -m "feat(cli): validate — generate/check audio, report narration-adjusted duration"
```

---

## Task 9: CLI — `preview-video.ts` dùng spec đã resolve

**Files:**
- Modify: `scripts/preview-video.ts`

- [ ] **Step 1: Sửa file**

```ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { specPath } from "../src/engine/AssetResolver";
import { resolveAudio } from "../src/engine/AudioResolver";
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

  console.log(`[preview] Đang sinh/kiểm tra audio (TTS/nhạc nền/SFX)...`);
  const resolved = await resolveAudio(root, id, spec);

  const propsFile = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "remotion-engine-preview-")), "props.json");
  await fs.writeFile(propsFile, JSON.stringify({ spec: resolved }));

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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sạch.

- [ ] **Step 3: Commit**

```bash
git add scripts/preview-video.ts
git commit -m "feat(cli): preview — pass the resolved (audio-generated) spec, not the raw one"
```

---

## Task 10: CLI — `render-video.ts` dùng spec đã resolve

**Files:**
- Modify: `scripts/render-video.ts`

- [ ] **Step 1: Sửa file**

```ts
import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { outputPath, specPath, videoDir } from "../src/engine/AssetResolver";
import { resolveAudio } from "../src/engine/AudioResolver";
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

  console.log(`[render] Đang sinh/kiểm tra audio (TTS/nhạc nền/SFX)...`);
  const resolved = await resolveAudio(root, id, spec);

  console.log(`[render] Đang bundle...`);
  const bundleLocation = await bundle({
    entryPoint: path.join(root, "src", "index.ts"),
    publicDir: videoDir(root, id), // assets/ trong spec resolve thẳng từ đây, không cần copy
  });

  console.log(`[render] Đang chọn composition...`);
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: "Video",
    inputProps: { spec: resolved },
  });

  const out = outputPath(root, id);
  await fs.mkdir(path.dirname(out), { recursive: true });

  console.log(`[render] Đang render ${composition.durationInFrames} khung hình...`);
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    outputLocation: out,
    inputProps: { spec: resolved },
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
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sạch.

- [ ] **Step 3: Commit**

```bash
git add scripts/render-video.ts
git commit -m "feat(cli): render — resolve audio before bundling, pass resolved spec as inputProps"
```

---

## Task 11: `Root.tsx` — nhận `ResolvedVideoSpec`, bỏ `.parse()` lại (sửa lỗi zod-strip)

**Files:**
- Modify: `src/Root.tsx`

- [ ] **Step 1: Sửa file**

`calculateMetadata` ở Round 1 gọi `videoSpecSchema.parse(props.spec)` — nếu giữ, nó sẽ âm thầm xoá `narrationAudioPath`/`sfxPaths` (field chỉ có sau `resolveAudio`, không khai báo trong zod schema gốc — zod mặc định strip field lạ). Bỏ hẳn `.parse()`, chỉ đọc `props.spec.settings` trực tiếp — props truyền vào luôn đã qua `resolveAudio` từ `render`/`preview` (Task 9, 10), không cần validate lại ở đây.

**Quan trọng**: dùng `import type` cho `ResolvedVideoSpec` — đây chỉ là kiểu dữ liệu, không phải giá trị runtime. Nếu dùng `import` thường, bundler của Remotion có thể cố gộp cả `AudioResolver.ts` (và qua đó `msedge-tts`, vốn dùng WebSocket/Node-only) vào bundle chạy trong browser — vừa không cần thiết vừa có thể làm hỏng build.

```tsx
import { Composition, type CalculateMetadataFunction } from "remotion";
import type { ResolvedVideoSpec } from "./engine/AudioResolver";
import { SAMPLE_SPEC } from "./sample-spec";
import { Video } from "./Video";

type Props = { spec: ResolvedVideoSpec };

const calculateMetadata: CalculateMetadataFunction<Props> = ({ props }) => {
  const { width, height, fps, duration } = props.spec.settings;
  return { width, height, fps, durationInFrames: Math.round(duration * fps) };
};

const DEFAULT_SPEC: ResolvedVideoSpec = {
  ...SAMPLE_SPEC,
  audio: { ...SAMPLE_SPEC.audio, sfxPaths: {} },
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Video"
    component={Video}
    durationInFrames={Math.round(SAMPLE_SPEC.settings.duration * SAMPLE_SPEC.settings.fps)}
    fps={SAMPLE_SPEC.settings.fps}
    width={SAMPLE_SPEC.settings.width}
    height={SAMPLE_SPEC.settings.height}
    defaultProps={{ spec: DEFAULT_SPEC }}
    calculateMetadata={calculateMetadata}
  />
);
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sạch. (Nếu `Video.tsx` chưa cập nhật prop type ở Task 12, có thể vẫn báo lỗi mismatch — việc đó sẽ hết ngay sau Task 12; tiếp tục nếu lỗi duy nhất còn lại là ở `Video.tsx`.)

- [ ] **Step 3: Commit**

```bash
git add src/Root.tsx
git commit -m "fix: Root.tsx trusts the already-resolved spec instead of re-parsing (zod was stripping new audio fields)"
```

---

## Task 12: `Video.tsx` — lắp narration + SFX vào timeline

**Files:**
- Modify: `src/Video.tsx`

- [ ] **Step 1: Sửa file**

```tsx
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import { SceneRenderer } from "./engine/SceneRenderer";
import { getTransitionPresentation, getTransitionTiming } from "./engine/TransitionRenderer";
import type { ResolvedVideoSpec } from "./engine/AudioResolver";

const SFX_VOLUME = 0.6;

export const Video: React.FC<{ spec: ResolvedVideoSpec }> = ({ spec }) => {
  const { fps } = spec.settings;
  const durationsInFrames = spec.scenes.map((scene) => Math.round(scene.duration * fps));

  const sfxCues: { frameOffset: number; path: string; durationInFrames: number }[] = [];
  let cumulative = 0;
  for (let i = 0; i < spec.scenes.length; i++) {
    cumulative += durationsInFrames[i];
    const nextScene = spec.scenes[i + 1];
    if (!nextScene) continue;
    const transition = nextScene.transition ?? { type: "fade" as const, duration: 0.4 };
    const transitionDurationInFrames = Math.round(transition.duration * fps);
    const sfxPath = spec.audio.sfxPaths[transition.type];
    if (sfxPath) {
      sfxCues.push({
        frameOffset: Math.max(0, cumulative - transitionDurationInFrames),
        path: sfxPath,
        durationInFrames: transitionDurationInFrames,
      });
    }
  }

  return (
    <AbsoluteFill style={{ backgroundColor: spec.style.backgroundColor }}>
      <TransitionSeries>
        {spec.scenes.flatMap((scene, i) => {
          const durationInFrames = durationsInFrames[i];
          const nodes = [
            <TransitionSeries.Sequence key={`${scene.id}-seq`} durationInFrames={durationInFrames}>
              <SceneRenderer scene={scene} style={spec.style} />
              {scene.narrationAudioPath ? <Audio src={staticFile(scene.narrationAudioPath)} /> : null}
            </TransitionSeries.Sequence>,
          ];
          const nextScene = spec.scenes[i + 1];
          if (nextScene) {
            const transition = nextScene.transition ?? { type: "fade" as const, duration: 0.4 };
            nodes.push(
              <TransitionSeries.Transition
                key={`${scene.id}-trans`}
                presentation={getTransitionPresentation(transition)}
                timing={getTransitionTiming(transition, fps)}
              />,
            );
          }
          return nodes;
        })}
      </TransitionSeries>
      {spec.audio.voiceOver ? <Audio src={staticFile(spec.audio.voiceOver)} /> : null}
      {spec.audio.music ? <Audio src={staticFile(spec.audio.music)} volume={spec.audio.musicVolume} /> : null}
      {sfxCues.map((cue, i) => (
        <Sequence key={`sfx-${i}`} from={cue.frameOffset} durationInFrames={cue.durationInFrames}>
          <Audio src={staticFile(cue.path)} volume={SFX_VOLUME} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
```

SFX nằm **ngoài** `TransitionSeries` (sibling trong `AbsoluteFill` ngoài cùng) vì `TransitionSeries` tự quản lý số khung hình riêng cho con của nó — chèn `<Sequence from={...}>` theo mốc tuyệt đối chỉ hoạt động đúng ở ngoài nó.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: sạch — đây là điểm nối cuối cùng giữa Task 7/11/12, nếu còn lỗi kiểu, khả năng cao là `ResolvedVideoSpec`/`SceneRenderer` prop không khớp (`SceneRenderer` nhận `scene: Scene` — `ResolvedScene` là `Scene & {narrationAudioPath?}` nên vẫn gán được, không cần sửa `SceneRenderer`).

- [ ] **Step 3: Chạy toàn bộ test suite**

Run: `npm test`
Expected: PASS toàn bộ (cộng dồn mọi test từ Task 2–7 cùng Round 1).

- [ ] **Step 4: Commit**

```bash
git add src/Video.tsx
git commit -m "feat: Video.tsx — per-scene narration Audio, SFX positioned by cumulative frame offset"
```

---

## Task 13: Video mẫu thật — kiểm tra toàn bộ audio pipeline

Không có test tự động nào thay được bước này — "nghe có đúng không" và "SFX có đúng thời điểm không" chỉ verify được bằng render thật + nghe/xem (giống Task 19 của Round 1).

**Files:**
- Modify: `videos/demo/video-spec.json` — thêm `narration` cho vài scene, đổi `audio.music` sang `{generate:true, mood:"ambient"}`, giữ `audio.sfx` mặc định `true`.

- [ ] **Step 1: Thêm narration + nhạc nền tự sinh vào spec demo**

Mở `videos/demo/video-spec.json`, thêm `"narration"` vào 2 scene đầu và đổi `"audio"`:

```json
  "audio": { "music": { "generate": true, "mood": "ambient" } },
```

Với scene `"hook"`, thêm field:
```json
  "narration": "remotion-engine. Một engine, nhiều video là dữ liệu.",
```

Với scene `"tagline"`, thêm field:
```json
  "narration": "Viết JSON, không viết code, cho mỗi video mới.",
```

- [ ] **Step 2: Validate**

Run: `npm run validate demo`
Expected: in ra dòng "Đang sinh/kiểm tra audio...", sau đó "OK" — nếu scene `hook`/`tagline` có narration dài hơn 2.5s khai báo, sẽ thấy dòng lưu ý settings.duration đã tăng.

- [ ] **Step 3: Render**

Run: `npm run render demo`
Expected: hoàn tất, ra `videos/demo/output/video.mp4`. Kiểm tra `videos/demo/assets/generated/` có chứa file `tts-*.mp3`, `music-ambient-*.wav`, và `sfx-<type>.wav` tương ứng các transition dùng trong spec (`slide`, `fade`, `wipe` — không có `sfx-none.wav` vì "none" luôn bị skip).

Run: `ls videos/demo/assets/generated/`

- [ ] **Step 4: Nghe/xem thật, xác nhận đúng 3 điều đã thiếu ở Round 1**

Mở `videos/demo/output/video.mp4`. Xác nhận:
- Có giọng đọc tiếng Việt ở 2 scene đầu, không bị cắt ngang giữa câu (nếu scene đã tự giãn duration đúng).
- Có nhạc nền ambient chạy xuyên suốt, không có tiếng click ở điểm nối do không fade.
- Nghe thấy SFX ngắn đúng lúc hình chuyển cảnh (whoosh khi slide, swell êm khi fade, click khi wipe) — **đối chiếu bằng mắt**: tạm dừng video đúng lúc nghe SFX, xác nhận đó cũng là lúc hình đang chuyển cảnh (không lệch quá 1-2 khung hình) — đây là bước verify công thức `frameOffset` mà spec thiết kế đã đánh dấu "chưa verify thật".

Nếu SFX nghe lệch rõ so với thời điểm chuyển cảnh, quay lại công thức `frameOffset` ở `Video.tsx` (Task 12) — khả năng cần trừ thêm/bớt nửa `transitionDurationInFrames` tuỳ cách `TransitionSeries` chồng khung hình thực tế (kiểm tra bằng cách thử lệch dần và render lại, vì đây là hành vi hình ảnh không suy ra được chỉ từ đọc `.d.ts`).

- [ ] **Step 5: Commit**

```bash
git add videos/demo/video-spec.json
git commit -m "chore: demo video — narration + generated ambient music + transition SFX, verifies Round 2 end to end"
```

(`videos/demo/assets/generated/` bị `.gitignore` bỏ qua không? — **kiểm tra lại `.gitignore`**: hiện chỉ có `videos/*/output`, chưa loại trừ `assets/generated/`. Thêm dòng `videos/*/assets/generated` vào `.gitignore` trước khi commit, vì đây là file tự sinh lại được từ spec, không cần lưu vào git — giống tinh thần không commit `dist/`/`node_modules/`.)

- [ ] **Step 6: Thêm `.gitignore` entry rồi commit riêng**

```bash
echo "videos/*/assets/generated" >> .gitignore
git add .gitignore
git commit -m "chore: ignore generated audio assets — reproducible from video-spec.json"
```

---

## Plan self-review notes

- **Spec coverage**: §2–§3 (narration field) → Task 2. §4.1 (TTS + duration) → Task 6–7. §4.2 (nhạc nền) → Task 4, 7. §4.3 (SFX) → Task 5, 7. §5 (WAV encode) → Task 3. §8 (CLI) → Task 8–10. §9 (Video.tsx) → Task 12, cùng fix §8's `Root.tsx` ở Task 11. §10 (testing boundary) → mọi task pure-logic đều có test (3–7), Task 13 là phần verify-bằng-tay duy nhất, đúng ranh giới đã định. §11 (dependency) → Task 1.
- **Placeholder scan**: không có TBD — duy nhất "cần verify thật lúc render" ở Task 13 Step 4 là một bước kiểm tra có chủ đích (được spec đánh dấu trước là chưa verify được chỉ bằng đọc code), không phải chỗ bỏ trống logic.
- **Type consistency**: `ResolvedScene`/`ResolvedVideoSpec` (Task 7) được `Root.tsx` (Task 11) và `Video.tsx` (Task 12) dùng xuyên suốt, cùng field name (`narrationAudioPath`, `audio.sfxPaths`, `audio.music: string|undefined`) không đổi giữa các task. `adjustedSceneDuration` (Task 7) dùng công thức đã chốt ở spec §4.1 và test Task 7 dùng đúng số liệu đã verify thật (3650ms). `TtsClient`/`synthesizeNarration`/`durationMsFromMetadata` (Task 6) được `AudioResolver` (Task 7) import và dùng đúng signature, không đổi tên giữa 2 task.
- **Rủi ro còn lại, đã ghi rõ trong Task 13**: công thức `frameOffset` cho SFX là suy luận hợp lý từ cấu trúc `TransitionSeries` nhưng chưa có cách verify nào ngoài render thật rồi nghe/xem — nếu sai, Task 13 Step 4 đã chỉ rõ hướng sửa (thử lệch dần, không đoán mù).
