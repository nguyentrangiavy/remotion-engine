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
