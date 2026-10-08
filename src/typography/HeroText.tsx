import type { CSSProperties, ReactNode } from "react";

export const HeroText: React.FC<{ children: ReactNode; color: string; style?: CSSProperties }> = ({
  children,
  color,
  style,
}) => (
  <div
    style={{
      fontSize: 72,
      fontWeight: 800,
      color,
      textAlign: "center",
      lineHeight: 1.2,
      fontFamily: "Inter, sans-serif",
      ...style,
    }}
  >
    {children}
  </div>
);
