/** Two buttons that draw a ring only when :focus-visible matches. */
const css = `
.fv-button { outline: none; }
.fv-button:focus-visible { outline: 3px solid #f97316; }
`;

export default function Buttons() {
  return (
    <div style={{ display: "flex", gap: 8, padding: 4 }}>
      <style>{css}</style>
      <button className="fv-button" data-probe="one">
        One
      </button>
      <button className="fv-button" data-probe="two">
        Two
      </button>
    </div>
  );
}
