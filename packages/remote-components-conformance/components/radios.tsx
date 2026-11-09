/** A button and a radio group with the middle radio checked: the group is one tab stop. */
export default function Radios() {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button data-probe="start">Start</button>
      <label>
        <input type="radio" name="size" data-probe="s" /> S
      </label>
      <label>
        <input type="radio" name="size" data-probe="m" defaultChecked /> M
      </label>
      <label>
        <input type="radio" name="size" data-probe="l" /> L
      </label>
    </div>
  );
}
