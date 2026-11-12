/** Relies on inherited color/font and host tokens; transparent background. */
export default function Themed() {
  return (
    <div data-probe="themed">
      <div
        data-probe="swatch"
        style={{
          background: "var(--accent)",
          borderRadius: "var(--radius)",
          color: "var(--accent-fg)",
          padding: "4px 8px",
        }}
      >
        Accent token
      </div>
      <p style={{ margin: "8px 0" }}>Inherited text color and font.</p>
      <button data-probe="button">System button</button>{" "}
      <input
        data-probe="input"
        defaultValue="System input"
        style={{ width: 120 }}
      />
    </div>
  );
}
