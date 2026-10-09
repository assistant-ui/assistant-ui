"use client";

import { useState } from "react";
import {
  ScheduleCard,
  type ScheduleRun,
} from "@/components/assistant-ui/elements/schedule-card";

const HISTORY: readonly ScheduleRun[] = [
  { id: "1", at: "Today, 06:00", ok: true },
  { id: "2", at: "Yesterday, 06:00", ok: true },
  { id: "3", at: "Sat, 06:00", ok: false },
];

export function ScheduleCardDemo() {
  const [enabled, setEnabled] = useState(true);

  return (
    <ScheduleCard
      name="Triage the issue queue"
      cadence="every day at 06:00"
      nextRun="Tomorrow, 06:00"
      enabled={enabled}
      history={HISTORY}
      onToggle={() => setEnabled((current) => !current)}
    />
  );
}
