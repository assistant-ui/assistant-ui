"use client";

import { useEffect, useState } from "react";
import { LiveDot } from "@/components/shared/live-dot";
import { STATUS_URL } from "@/lib/constants";
import type { StatusState } from "@/lib/status-state";

const PRESENTATION: Record<StatusState, { label: string; dot: string }> = {
  operational: { label: "All systems operational", dot: "bg-emerald-500" },
  degraded: { label: "Degraded performance", dot: "bg-amber-500" },
  downtime: { label: "Service disruption", dot: "bg-red-500" },
  maintenance: { label: "Under maintenance", dot: "bg-blue-500" },
};

export function StatusBadge(): React.ReactElement {
  const [state, setState] = useState<StatusState | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch("/api/status", { signal: controller.signal });
        if (!res.ok) return;
        const body = (await res.json()) as { state?: StatusState | null };
        setState(body.state ?? null);
      } catch {
        setState(null);
      }
    };
    void load();

    return () => controller.abort();
  }, []);

  const presentation = state ? PRESENTATION[state] : null;

  return (
    <a
      href={STATUS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
    >
      {presentation ? <LiveDot className={presentation.dot} /> : null}
      {presentation?.label ?? "Status"}
    </a>
  );
}
