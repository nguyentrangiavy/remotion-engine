export function typewriterVisibleChars(
  frame: number,
  fps: number,
  totalChars: number,
  charsPerSecond = 18,
): number {
  const shown = Math.floor((frame / fps) * charsPerSecond);
  return Math.min(totalChars, Math.max(0, shown));
}
