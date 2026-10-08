import { AbsoluteFill } from "remotion";
import type { ReactNode } from "react";

export const Floating: React.FC<{ children: ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 120 }}>
    <div
      style={{
        width: "100%",
        height: "70%",
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
        position: "relative",
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);
