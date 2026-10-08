import { AbsoluteFill } from "remotion";
import type { ReactNode } from "react";

export const Grid: React.FC<{ children: ReactNode[]; columns?: number }> = ({ children, columns = 2 }) => (
  <AbsoluteFill style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 12, padding: 24 }}>
    {children.map((child, i) => (
      <div key={i} style={{ position: "relative", overflow: "hidden", borderRadius: 12 }}>
        {child}
      </div>
    ))}
  </AbsoluteFill>
);
