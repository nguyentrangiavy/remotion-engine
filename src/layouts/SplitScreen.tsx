import { AbsoluteFill } from "remotion";
import type { ReactNode } from "react";

export const SplitScreen: React.FC<{
  children: [ReactNode, ReactNode];
  direction?: "horizontal" | "vertical";
  ratio?: number;
}> = ({ children, direction = "horizontal", ratio = 0.5 }) => {
  const [a, b] = children;
  const horizontal = direction === "horizontal";
  const sizeKey = horizontal ? "width" : "height";
  return (
    <AbsoluteFill style={{ flexDirection: horizontal ? "row" : "column" }}>
      <div style={{ [sizeKey]: `${ratio * 100}%`, position: "relative", overflow: "hidden" }}>{a}</div>
      <div style={{ [sizeKey]: `${(1 - ratio) * 100}%`, position: "relative", overflow: "hidden" }}>{b}</div>
    </AbsoluteFill>
  );
};
