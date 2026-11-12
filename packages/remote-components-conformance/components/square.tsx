/** Height equals width: narrower is shorter (the scrollbar feedback-loop case). */
export default function Square() {
  return (
    <div
      data-probe="square"
      style={{ aspectRatio: "1", background: "#c7d2fe" }}
    />
  );
}
