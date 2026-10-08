import type { CSSProperties, ReactNode } from "react";

export const Subtitle: React.FC<{ children: ReactNode; color: string; style?: CSSProperties }> = ({
  children,
  color,
  style,
}) => (
  <div style={{ fontSize: 32, fontWeight: 500, color, textAlign: "center", fontFamily: "Inter, sans-serif", ...style }}>
    {children}
  </div>
);
