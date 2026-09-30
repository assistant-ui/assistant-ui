import { useState } from "react";
import {
  ScheduleCard,
  type ScheduleRun,
} from "@assistant-ui/ui/components/assistant-ui/elements/schedule-card.tsx";
import { defineSections } from "../types";

const HISTORY: readonly ScheduleRun[] = [
  { id: "1", at: "Today, 06:00", ok: true },
  { id: "2", at: "Yesterday, 06:00", ok: true },
  { id: "3", at: "Sat, 06:00", ok: false },
];

function Schedule({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  return (
    <ScheduleCard
      name="Run the readiness probes"
      cadence="every day at 06:00"
      nextRun="Tomorrow, 06:00"
      enabled={enabled}
      history={HISTORY}
      onToggle={() => setEnabled((current) => !current)}
    />
  );
}

export default defineSections([
  {
    id: "schedule-card",
    title: "Schedule card",
    category: "content",
    notes: "Enabled with run history, then paused.",
    render: () => (
      <div className="flex flex-col gap-3">
        <Schedule initialEnabled />
        <Schedule initialEnabled={false} />
      </div>
    ),
  },
]);
