import { AbsoluteFill } from "remotion";
import type { ReactNode } from "react";

export const Centered: React.FC<{ children: ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80 }}>{children}</AbsoluteFill>
);
