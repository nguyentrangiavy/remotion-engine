import { useCurrentFrame, useVideoConfig } from "remotion";
import { typewriterVisibleChars } from "../animations/typewriter";

export const KineticText: React.FC<{ text: string; color: string }> = ({ text, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = typewriterVisibleChars(frame, fps, text.length);
  return (
    <div style={{ fontSize: 56, fontWeight: 700, color, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
      {text.slice(0, n)}
    </div>
  );
};
