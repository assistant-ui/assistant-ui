/** Fills whatever height the host gives it (stretch, aspect-ratio, fixed height). */
export default function Fill({ label = "fill" }: { label?: string }) {
  return (
    <div
      data-probe="fill"
      style={{
        height: "100%",
        minHeight: 24,
        boxSizing: "border-box",
        background: "#fde68a",
        border: "2px solid #d97706",
      }}
    >
      {label}
    </div>
  );
}
