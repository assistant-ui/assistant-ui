"use client";

import { useEffect, useState } from "react";
import { formatCompact } from "@/lib/format";

export function NpmDownloads() {
  const [downloads, setDownloads] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/npm/downloads")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.downloads === "number") {
          setDownloads(data.downloads);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <span>
      <span className="tabular-nums">
        {downloads !== null ? formatCompact(downloads) : "—"}
      </span>{" "}
      weekly downloads
    </span>
  );
}
