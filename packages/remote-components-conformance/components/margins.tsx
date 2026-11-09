/** Margins on first/last children must stay inside the box (flow-root model). */
export default function Margins() {
  return (
    <div>
      <p data-probe="p1" style={{ margin: "16px 0", background: "#bbf7d0" }}>
        First paragraph with margins.
      </p>
      <p
        data-probe="p2"
        style={{ margin: "16px 0 24px", background: "#bae6fd" }}
      >
        Second paragraph.
      </p>
    </div>
  );
}
