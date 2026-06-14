"use client";

import { useEffect, useState } from "react";

const formatDownloads = (count: number) => {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${Math.round(count / 1_000)}k`;
  }
  return count.toString();
};

export function NpmDownloads() {
  const [downloads, setDownloads] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/npm/downloads")
      .then((res) => res.json())
      .then((data) => setDownloads(data.downloads))
      .catch(console.error);
  }, []);

  return (
    <span>
      <span className="tabular-nums">
        {downloads ? formatDownloads(downloads) : "—"}
      </span>{" "}
      weekly downloads
    </span>
  );
}
