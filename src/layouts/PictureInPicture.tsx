import { AbsoluteFill } from "remotion";
import type { ReactNode } from "react";

export const PictureInPicture: React.FC<{ children: [ReactNode, ReactNode] }> = ({ children }) => {
  const [main, pip] = children;
  return (
    <AbsoluteFill>
      {main}
      <div
        style={{
          position: "absolute",
          right: 40,
          bottom: 40,
          width: "32%",
          aspectRatio: "16 / 9",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        {pip}
      </div>
    </AbsoluteFill>
  );
};
