"use client";

import {
  ScheduleCard,
  type ScheduleRun,
} from "@/components/assistant-ui/elements/schedule-card";
import { defineStates } from "./types";

const noop = () => {};

const HISTORY: readonly ScheduleRun[] = [
  { id: "1", at: "Today, 06:00", ok: true },
  { id: "2", at: "Yesterday, 06:00", ok: true },
  { id: "3", at: "Sat, 06:00", ok: false },
];

const base = {
  name: "Triage the issue queue",
  cadence: "every day at 06:00",
  nextRun: "Tomorrow, 06:00",
  onToggle: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "disabled",
    label: "Paused",
    note: "The schedule is off, so the next run reads paused.",
    Component: () => (
      <ScheduleCard {...base} enabled={false} history={HISTORY} />
    ),
  },
  {
    key: "empty",
    label: "Never run",
    note: "A new schedule with no runs yet.",
    Component: () => (
      <ScheduleCard
        {...base}
        name="Summarize new support tickets"
        cadence="every Monday at 09:00"
        nextRun="Mon, 09:00"
        enabled
        history={[]}
      />
    ),
  },
  {
    key: "error",
    label: "Failing",
    note: "Every recent run failed.",
    Component: () => (
      <ScheduleCard
        {...base}
        name="Sync the CRM export"
        cadence="every hour"
        nextRun="Today, 15:00"
        enabled
        history={[
          { id: "1", at: "Today, 14:00", ok: false },
          { id: "2", at: "Today, 13:00", ok: false },
          { id: "3", at: "Today, 12:00", ok: false },
        ]}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long name",
    note: "A long name and cadence stay inside the card next to the switch.",
    Component: () => (
      <ScheduleCard
        {...base}
        name="Audit every runtime adapter for missing thread list methods"
        cadence="weekdays at 06:00 and 18:00 Pacific"
        nextRun="Today, 18:00 Pacific"
        enabled
        history={[
          { id: "1", at: "Today, 06:00 Pacific, 14 gaps found", ok: true },
          { id: "2", at: "Yesterday, 18:00 Pacific", ok: true },
          { id: "3", at: "Yesterday, 06:00 Pacific", ok: true },
          {
            id: "4",
            at: "Fri, 18:00 Pacific, timed out after 30 minutes",
            ok: false,
          },
          { id: "5", at: "Fri, 06:00 Pacific", ok: true },
        ]}
      />
    ),
  },
]);
