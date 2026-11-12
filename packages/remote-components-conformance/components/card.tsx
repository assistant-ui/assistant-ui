export default function Card({
  title = "Card title",
  body = "Some body text that wraps when the card is narrow.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div
      data-probe="card"
      style={{
        padding: 12,
        borderRadius: 8,
        background: "var(--card-bg, #e0e7ff)",
        border: "1px solid #6366f1",
      }}
    >
      <strong data-probe="title" style={{ display: "block", marginBottom: 4 }}>
        {title}
      </strong>
      <span data-probe="body">{body}</span>
    </div>
  );
}
