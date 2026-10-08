export const QuoteText: React.FC<{ quote: string; author?: string; color: string; accentColor: string }> = ({
  quote,
  author,
  color,
  accentColor,
}) => (
  <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", maxWidth: 800 }}>
    <div style={{ fontSize: 44, fontWeight: 600, color, lineHeight: 1.4 }}>&ldquo;{quote}&rdquo;</div>
    {author ? <div style={{ fontSize: 24, color: accentColor, marginTop: 24 }}>— {author}</div> : null}
  </div>
);
