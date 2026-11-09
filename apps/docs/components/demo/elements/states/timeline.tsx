"use client";

import {
  Timeline,
  type TimelineEvent,
} from "@/components/assistant-ui/elements/timeline";
import { defineStates } from "./types";

const EVENTS: readonly TimelineEvent[] = [
  {
    id: "1",
    when: "past",
    time: "09:02",
    title: "Issue filed",
    detail: "Draft survives a thread switch",
  },
  { id: "2", when: "past", time: "09:40", title: "Reproduced" },
  {
    id: "3",
    when: "now",
    time: "10:15",
    title: "Fix in review",
    detail: "Clears the slot on switch",
  },
  { id: "4", when: "future", time: "11:00", title: "Release 0.14.1" },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "streaming",
    label: "Streaming",
    note: "Two events have arrived and the rest are still coming.",
    Component: () => <Timeline events={EVENTS} visibleCount={2} />,
  },
  {
    key: "complete",
    label: "All past",
    note: "Every event has already happened.",
    Component: () => (
      <Timeline
        events={[
          { id: "1", when: "past", time: "09:02", title: "Issue filed" },
          { id: "2", when: "past", time: "09:40", title: "Reproduced" },
          { id: "3", when: "past", time: "10:15", title: "Fix merged" },
          {
            id: "4",
            when: "past",
            time: "11:00",
            title: "Release 0.14.1",
            detail: "Published to npm",
          },
        ]}
        visibleCount={4}
      />
    ),
  },
  {
    key: "upcoming",
    label: "All upcoming",
    note: "Nothing has happened yet, so every event is still ahead.",
    Component: () => (
      <Timeline
        events={[
          { id: "1", when: "future", time: "Nov 10", title: "Code freeze" },
          {
            id: "2",
            when: "future",
            time: "Nov 12",
            title: "Release candidate",
          },
          { id: "3", when: "future", time: "Nov 17", title: "Launch" },
        ]}
        visibleCount={3}
      />
    ),
  },
  {
    key: "single",
    label: "Single event",
    note: "One event draws no connecting line.",
    Component: () => (
      <Timeline
        events={[
          {
            id: "1",
            when: "now",
            time: "14:30",
            title: "Deploy in progress",
            detail: "Rolling out to 3 of 12 regions",
          },
        ]}
        visibleCount={1}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long detail",
    note: "Long titles and details wrap within the event column.",
    Component: () => (
      <Timeline
        events={[
          {
            id: "1",
            when: "past",
            time: "08:12",
            title: "Pager alert: elevated 5xx on api-gateway-us-east-1",
            detail:
              "Error rate rose from 0.2% to 6.8% after deploy 2026.11.03-1 rolled out to the primary region.",
          },
          {
            id: "2",
            when: "now",
            time: "08:31",
            title: "Rolling back to 2026.11.02-4",
            detail:
              "Traffic is draining from the new pods. Connection pool settings from the bad deploy are being reverted by hand on the two canaries that missed the rollback.",
          },
          {
            id: "3",
            when: "future",
            time: "09:30",
            title: "Postmortem draft due",
          },
        ]}
        visibleCount={3}
      />
    ),
  },
]);
