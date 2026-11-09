/** Overlay content: a menu. Calls back into the remote that opened it. */
export default function Menu({
  items = [],
  onSelect,
}: {
  items?: string[];
  onSelect?: (item: string) => Promise<void>;
}) {
  return (
    <div
      role="menu"
      style={{
        background: "Canvas",
        color: "CanvasText",
        border: "1px solid #888",
        borderRadius: 6,
        padding: 4,
        boxShadow: "0 4px 12px rgba(0,0,0,.2)",
      }}
    >
      {items.map((item) => (
        <button
          key={item}
          role="menuitem"
          data-item={item}
          style={{ display: "block", width: "100%", textAlign: "left" }}
          onClick={() => void onSelect?.(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
