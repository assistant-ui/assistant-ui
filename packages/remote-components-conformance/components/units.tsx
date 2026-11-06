/** rem must follow the host root font-size; em the slot font-size. */
export default function Units() {
  return (
    <div>
      <div
        data-probe="rem"
        style={{ width: "10rem", height: "1rem", background: "#a5b4fc" }}
      />
      <div
        data-probe="em"
        style={{ width: "10em", height: "1em", background: "#fca5a5" }}
      />
      <span style={{ fontSize: "1.5em", lineHeight: "normal" }}>Big</span>{" "}
      <span>normal text</span>
    </div>
  );
}
