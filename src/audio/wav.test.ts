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
