"use client";

import type { ToolCallMessagePartStatus } from "@assistant-ui/react";
import {
  ToolGroupContent,
  ToolGroupRoot,
  ToolGroupTrigger,
} from "@/components/assistant-ui/elements/tool-group.aui";
import {
  ToolFallbackArgs,
  ToolFallbackContent,
  ToolFallbackError,
  ToolFallbackResult,
  ToolFallbackRoot,
  ToolFallbackTrigger,
} from "@/components/assistant-ui/elements/tool-fallback.aui";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import { defineStates } from "./types";

const noop = () => {};

type Call = {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  status?: ToolCallMessagePartStatus;
};

function Call({ toolName, args, result, status }: Call) {
  return (
    <ToolFallbackRoot>
      <ToolFallbackTrigger
        toolName={toolName}
        status={status ?? { type: "complete" }}
      />
      <ToolFallbackContent>
        {status && <ToolFallbackError status={status} />}
        <ToolFallbackArgs argsText={JSON.stringify(args, null, 2)} />
        <ToolFallbackResult result={result} />
      </ToolFallbackContent>
    </ToolFallbackRoot>
  );
}

function Group({
  calls,
  active = false,
}: {
  calls: readonly Call[];
  active?: boolean;
}) {
  return (
    <SampleRuntimeProvider>
      <div className="w-full max-w-lg">
        <ToolGroupRoot open onOpenChange={noop}>
          <ToolGroupTrigger count={calls.length} active={active} />
          <ToolGroupContent aria-busy={active}>
            {calls.map((call, index) => (
              <Call key={index} {...call} />
            ))}
          </ToolGroupContent>
        </ToolGroupRoot>
      </div>
    </SampleRuntimeProvider>
  );
}

const WEATHER: Call = {
  toolName: "get_weather",
  args: { location: "Paris" },
  result: { temperature: 68, condition: "Sunny" },
};
const WEATHER_2: Call = {
  toolName: "get_weather",
  args: { location: "Berlin" },
  result: { temperature: 55, condition: "Rainy" },
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "running",
    label: "Running",
    note: "The last call in the group is still running, so the trigger shimmers.",
    Component: () => (
      <Group
        active
        calls={[
          WEATHER,
          WEATHER_2,
          {
            toolName: "search_web",
            args: { query: "Paris vs Berlin weather this week" },
            status: { type: "running" },
          },
        ]}
      />
    ),
  },
  {
    key: "partial",
    label: "One failed",
    note: "One call in the group failed while the others finished.",
    Component: () => (
      <Group
        calls={[
          WEATHER,
          {
            toolName: "get_weather",
            args: { location: "Reykjavik" },
            status: {
              type: "incomplete",
              reason: "error",
              error: "Upstream timed out after 10s",
            },
          },
          WEATHER_2,
        ]}
      />
    ),
  },
  {
    key: "single",
    label: "Single call",
    note: "A group of one uses the singular label.",
    Component: () => <Group calls={[WEATHER]} />,
  },
  {
    key: "long-content",
    label: "Many calls",
    note: "Eight calls in one turn stack inside the open group.",
    Component: () => (
      <Group
        calls={[
          "src/app/page.tsx",
          "src/app/layout.tsx",
          "src/components/header.tsx",
          "src/components/footer.tsx",
          "src/lib/auth.ts",
          "src/lib/db.ts",
          "src/lib/stripe.ts",
          "package.json",
        ].map((path) => ({
          toolName: "read_file",
          args: { path },
          result: "ok",
        }))}
      />
    ),
  },
]);
