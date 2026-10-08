export const HighlightText: React.FC<{ children: string; color: string; accentColor: string }> = ({
  children,
  color,
  accentColor,
}) => (
  <div style={{ fontSize: 48, fontWeight: 700, color, textAlign: "center", fontFamily: "Inter, sans-serif" }}>
    <span style={{ background: accentColor, padding: "2px 10px", borderRadius: 6 }}>{children}</span>
  </div>
);
