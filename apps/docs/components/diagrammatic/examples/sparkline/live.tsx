"use client";

import { useEffect, useState } from "react";
import { Sparkline } from "diagrammatic";

export default function LiveSparkline() {
  const [data, setData] = useState(() =>
    Array.from({ length: 24 }, (_, i) => 20 + Math.sin(i / 3) * 6),
  );

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t = 0;
    const id = setInterval(() => {
      t += 1;
      setData((prev) => {
        const last = prev[prev.length - 1] ?? 20;
        const next = Math.max(
          4,
          Math.min(40, last + Math.sin(t * 1.7) * 3 + Math.cos(t / 5) * 2),
        );
        return [...prev.slice(1), next];
      });
    }, 800);
    return () => clearInterval(id);
  }, []);

  const current = Math.round(data[data.length - 1] ?? 0);
  return (
    <p data-dg-motion="" className="text-2xl font-medium tabular-nums">
      {current} req/s{" "}
      <Sparkline data={data} fill title="Requests per second, live" />
    </p>
  );
}
