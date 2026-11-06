import { useRef, useState } from "react";

/** Calls a slow host function with an AbortSignal and can cancel it. */
export default function Search({
  onSearch,
}: {
  onSearch?: (q: string, opts: { signal: AbortSignal }) => Promise<string>;
}) {
  const [status, setStatus] = useState("idle");
  const ac = useRef<AbortController | null>(null);
  const start = () => {
    ac.current = new AbortController();
    setStatus("pending");
    onSearch?.("needle", { signal: ac.current.signal }).then(
      (r) => setStatus(`done:${r}`),
      (e: Error) => setStatus(`error:${e.name}`),
    );
  };
  return (
    <div>
      <button data-probe="start" onClick={start}>
        Search
      </button>{" "}
      <button data-probe="cancel" onClick={() => ac.current?.abort()}>
        Cancel
      </button>{" "}
      <span data-probe="status">{status}</span>
    </div>
  );
}
