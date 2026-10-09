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
