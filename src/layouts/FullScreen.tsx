import { AbsoluteFill } from "remotion";
import type { ReactNode } from "react";

export const FullScreen: React.FC<{ children: ReactNode }> = ({ children }) => <AbsoluteFill>{children}</AbsoluteFill>;
