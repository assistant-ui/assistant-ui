"use client";

import {
  BackgroundInbox,
  type BackgroundRun,
} from "@/components/assistant-ui/elements/background-inbox";
import { defineStates } from "./types";

const noop = () => {};

const RUNNING: readonly BackgroundRun[] = [
  {
    id: "1",
    title: "Audit the adapters for parity gaps",
    state: "running",
    elapsed: "4m",
  },
  {
    id: "2",
    title: "Regenerate the API reference",
    state: "running",
    elapsed: "1m",
  },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "running",
    label: "In flight",
    note: "Every run is still going and none can be collected yet.",
    Component: () => <BackgroundInbox runs={RUNNING} onCollect={noop} />,
  },
  {
    key: "success",
    label: "All ready",
    note: "Every run finished and waits to be collected.",
    Component: () => (
      <BackgroundInbox
        onCollect={noop}
        runs={[
          {
            id: "1",
            title: "Audit the adapters for parity gaps",
            state: "ready",
            elapsed: "6m",
            summary: "6 gaps found",
          },
          {
            id: "2",
            title: "Regenerate the API reference",
            state: "ready",
            elapsed: "3m",
            summary: "142 pages written",
          },
        ]}
      />
    ),
  },
  {
    key: "error",
    label: "Failed",
    note: "A run failed and shows why next to one still running.",
    Component: () => (
      <BackgroundInbox
        onCollect={noop}
        runs={[
          {
            id: "3",
            title: "Bump dependencies",
            state: "failed",
            elapsed: "2m",
            summary: "lockfile conflict",
          },
          {
            id: "2",
            title: "Regenerate the API reference",
            state: "running",
            elapsed: "1m",
          },
        ]}
      />
    ),
  },
  {
    key: "empty",
    label: "Empty",
    note: "Nothing is running in the background.",
    Component: () => <BackgroundInbox runs={[]} onCollect={noop} />,
  },
  {
    key: "read-only",
    label: "Read only",
    note: "Without a collect handler the runs are listed but not clickable.",
    Component: () => (
      <BackgroundInbox
        runs={[
          {
            id: "1",
            title: "Audit the adapters for parity gaps",
            state: "ready",
            elapsed: "4m",
            summary: "6 gaps found",
          },
          ...RUNNING.slice(1),
        ]}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long titles",
    note: "Long titles and summaries truncate on one line.",
    Component: () => (
      <BackgroundInbox
        onCollect={noop}
        runs={[
          {
            id: "1",
            title:
              "Audit every runtime adapter for missing thread list methods and document the gaps",
            state: "ready",
            elapsed: "1h 12m",
            summary:
              "14 gaps across LangGraph, AI SDK, and the external store adapter",
          },
          {
            id: "2",
            title:
              "Port the composer tests from Jest to Vitest across all packages",
            state: "running",
            elapsed: "38m",
          },
        ]}
      />
    ),
  },
]);
