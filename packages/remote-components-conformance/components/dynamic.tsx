import { useState } from "react";

export default function Dynamic({ initial = 1 }: { initial?: number }) {
  const [n, setN] = useState(initial);
  return (
    <div style={{ background: "#f5d0fe", padding: 8 }}>
      <button data-probe="add" onClick={() => setN((x) => x + 1)}>
        Add
      </button>{" "}
      <button data-probe="wide" onClick={() => setN((x) => x + 10)}>
        Add ten
      </button>{" "}
      <button
        data-action="self-reload"
        onClick={() => location.reload()}
        style={{ display: "none" }}
      >
        reload
      </button>
      <ul data-probe="list" style={{ margin: 0 }}>
        {Array.from({ length: n }, (_, i) => (
          <li key={i}>Item number {i + 1}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The static-HTML variant of this page (RC_VARIANT=static) has no React,
 * so it carries its own script, as a hand-written page would.
 */
export const staticScript = `
const list = document.querySelector("[data-probe=list]");
const add = (n) => { for (let i = 0; i < n; i++) { const li = document.createElement("li"); li.textContent = "Item number " + (list.children.length + 1); list.append(li); } };
document.querySelector("[data-probe=add]").onclick = () => add(1);
document.querySelector("[data-probe=wide]").onclick = () => add(10);
document.querySelector("[data-action=self-reload]").onclick = () => location.reload();
`;
