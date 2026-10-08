import { useCurrentFrame, useVideoConfig } from "remotion";
import { typewriterVisibleChars } from "../animations/typewriter";

export const CodeText: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = typewriterVisibleChars(frame, fps, code.length, 30);
  return (
    <pre
      style={{
        fontFamily: "'Courier New', monospace",
        fontSize: 28,
        color: "#E4E7EC",
        background: "#0B0D13",
        padding: 32,
        borderRadius: 12,
        whiteSpace: "pre-wrap",
        maxWidth: 900,
      }}
    >
      <code>{code.slice(0, n)}</code>
      {language ? null : null /* language dành cho Round 2 khi thêm tô cú pháp thật */}
    </pre>
  );
};
