import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const CounterText: React.FC<{ from?: number; to: number; durationInFrames: number; color: string }> = ({
  from = 0,
  to,
  durationInFrames,
  color,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const countFrames = Math.min(durationInFrames, Math.round(fps * 1.2));
  const value = Math.round(
    interpolate(frame, [0, countFrames], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  return (
    <div style={{ fontSize: 96, fontWeight: 800, color, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
      {value.toLocaleString()}
    </div>
  );
};
