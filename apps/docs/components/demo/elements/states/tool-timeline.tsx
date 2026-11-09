"use client";

import {
  FileSearchIcon,
  PenLineIcon,
  SearchIcon,
  SparklesIcon,
  TerminalIcon,
} from "lucide-react";
import {
  ToolTimeline,
  type TimelineStat,
  type TimelineStep,
} from "@/components/assistant-ui/elements/tool-timeline";
import { defineStates } from "./types";

const noop = () => {};

const STEPS: TimelineStep[] = [
  { verb: "Thinking", chip: "planning the change", icon: SparklesIcon },
  { verb: "Read", chip: "thread.tsx", icon: FileSearchIcon },
  { verb: "Ran", chip: "pnpm vitest", icon: TerminalIcon },
  { verb: "Edited", chip: "composer.tsx", icon: PenLineIcon },
];

const STATS: TimelineStat[] = [
  { file: "composer.tsx", added: 14, removed: 3 },
  { file: "use-draft.ts", added: 42 },
];

const base = {
  steps: STEPS,
  stats: STATS,
  onOpenChange: noop,
  restingLabel: "4 steps · 2 files changed",
  activeLabel: "Working for 3s",
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "streaming",
    label: "Streaming",
    note: "The session is still running and only the first two steps have arrived.",
    Component: () => <ToolTimeline {...base} visibleSteps={2} streaming open />,
  },
  {
    key: "collapsed",
    label: "Collapsed",
    note: "A finished session folded down to its summary line.",
    Component: () => (
      <ToolTimeline
        {...base}
        visibleSteps={STEPS.length}
        streaming={false}
        open={false}
      />
    ),
  },
  {
    key: "no-changes",
    label: "No changes",
    note: "A read-only session that touched no files, so there are no file stats.",
    Component: () => (
      <ToolTimeline
        {...base}
        steps={[
          { verb: "Searched", chip: "useDraft", icon: SearchIcon },
          { verb: "Read", chip: "use-draft.ts", icon: FileSearchIcon },
          { verb: "Read", chip: "composer.tsx", icon: FileSearchIcon },
        ]}
        stats={[]}
        visibleSteps={3}
        streaming={false}
        open
        restingLabel="3 steps · no files changed"
      />
    ),
  },
  {
    key: "long-content",
    label: "Long session",
    note: "Many steps with long paths and a wide set of file stats that wrap.",
    Component: () => (
      <ToolTimeline
        {...base}
        steps={[
          {
            verb: "Thinking",
            chip: "tracing the remote thread list",
            icon: SparklesIcon,
          },
          {
            verb: "Read",
            chip: "packages/react/src/runtimes/remote-thread-list/RemoteThreadListThreadListRuntimeCore.tsx",
            icon: FileSearchIcon,
          },
          {
            verb: "Searched",
            chip: "unstable_RemoteThreadListAdapter",
            icon: SearchIcon,
          },
          {
            verb: "Edited",
            chip: "packages/react/src/runtimes/remote-thread-list/EMPTY_THREAD_CORE.tsx",
            icon: PenLineIcon,
          },
          {
            verb: "Edited",
            chip: "packages/react/src/runtimes/remote-thread-list/OptimisticState.ts",
            icon: PenLineIcon,
          },
          {
            verb: "Ran",
            chip: "pnpm --filter @assistant-ui/react vitest run remote-thread-list",
            icon: TerminalIcon,
          },
          {
            verb: "Ran",
            chip: "pnpm turbo build --filter=@assistant-ui/react",
            icon: TerminalIcon,
          },
        ]}
        stats={[
          {
            file: "RemoteThreadListThreadListRuntimeCore.tsx",
            added: 128,
            removed: 61,
          },
          { file: "EMPTY_THREAD_CORE.tsx", added: 9, removed: 2 },
          { file: "OptimisticState.ts", added: 37, removed: 14 },
          { file: "remote-thread-list.test.ts", added: 204 },
          { file: "legacy-adapter.ts", removed: 88 },
        ]}
        visibleSteps={7}
        streaming={false}
        open
        restingLabel="7 steps · 5 files changed"
      />
    ),
  },
]);
