export default function Focus() {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input data-probe="first" placeholder="first" />
      <input data-probe="second" placeholder="second" />
    </div>
  );
}
