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
      case "wipe": {
        // tấn công nhanh rồi tắt dần — vẫn chạm 0 ở 2 đầu, khác hẳn hình chuông đối xứng của "fade"/"blur"
        const attack = 0.08;
        const clickEnvelope = progress < attack ? progress / attack : Math.max(0, 1 - (progress - attack) / (1 - attack));
        v = clickEnvelope * noise() * 0.6;
        break;
      }
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
