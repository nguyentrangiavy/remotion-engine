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
