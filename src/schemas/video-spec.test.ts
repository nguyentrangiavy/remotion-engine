import { describe, expect, it } from "vitest";
import { videoSpecSchema } from "./video-spec";

const base = {
  version: "1.0" as const,
  id: "demo",
  settings: { width: 1080, height: 1920, fps: 30, duration: 10 },
  scenes: [{ id: "s1", type: "image" as const, duration: 5, src: "assets/a.png" }],
};

describe("videoSpecSchema", () => {
  it("accepts a minimal valid spec and fills in style/audio defaults", () => {
    const result = videoSpecSchema.parse(base);
    expect(result.style.backgroundColor).toBe("#050505");
    expect(result.audio.musicVolume).toBe(0.15);
    expect(result.scenes[0]).toMatchObject({ type: "image", src: "assets/a.png" });
  });

  it("rejects an id with uppercase letters", () => {
    expect(() => videoSpecSchema.parse({ ...base, id: "Demo" })).toThrow();
  });

  it("rejects a spec with zero scenes", () => {
    expect(() => videoSpecSchema.parse({ ...base, scenes: [] })).toThrow();
  });

  it("rejects an image scene with no src", () => {
    expect(() =>
      videoSpecSchema.parse({ ...base, scenes: [{ id: "s1", type: "image", duration: 5 }] }),
    ).toThrow();
  });

  it("rejects an unknown scene type", () => {
    expect(() =>
      videoSpecSchema.parse({ ...base, scenes: [{ id: "s1", type: "not-a-type", duration: 5 }] }),
    ).toThrow();
  });

  it("rejects an unknown animation type", () => {
    const spec = { ...base, scenes: [{ ...base.scenes[0], animation: { type: "superZoom" } }] };
    expect(() => videoSpecSchema.parse(spec)).toThrow();
  });

  it("fills in animation defaults (duration/intensity/easing) when type is given", () => {
    const spec = { ...base, scenes: [{ ...base.scenes[0], animation: { type: "kenBurns" } }] };
    const result = videoSpecSchema.parse(spec);
    expect(result.scenes[0].animation).toMatchObject({ type: "kenBurns", intensity: 0.15, easing: "easeOut" });
  });

  it("accepts a video scene with volume/muted defaults", () => {
    const spec = { ...base, scenes: [{ id: "s1", type: "video", duration: 5, src: "assets/a.mp4" }] };
    const result = videoSpecSchema.parse(spec);
    expect(result.scenes[0]).toMatchObject({ volume: 1, muted: false });
  });

  it("accepts a split scene with two sides", () => {
    const spec = {
      ...base,
      scenes: [
        {
          id: "s1",
          type: "split",
          duration: 5,
          left: { kind: "image", src: "assets/a.png" },
          right: { kind: "text", content: "hello" },
        },
      ],
    };
    expect(() => videoSpecSchema.parse(spec)).not.toThrow();
  });

  it("accepts a grid scene requiring at least 2 items", () => {
    const valid = { ...base, scenes: [{ id: "s1", type: "grid", duration: 5, items: [{ src: "a.png" }, { src: "b.png" }] }] };
    expect(() => videoSpecSchema.parse(valid)).not.toThrow();
    const invalid = { ...base, scenes: [{ id: "s1", type: "grid", duration: 5, items: [{ src: "a.png" }] }] };
    expect(() => videoSpecSchema.parse(invalid)).toThrow();
  });

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
});
