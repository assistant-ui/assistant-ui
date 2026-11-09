"use client";

import { ToolCall } from "@/components/assistant-ui/elements/tool-call";
import { defineStates } from "./types";

const noop = () => {};

const base = {
  label: "Searched the docs",
  activeLabel: "Searching the docs",
  query: "draft persistence",
  request: '{"query": "draft persistence"}',
  result: "3 matches, best hit /docs/runtime/drafts",
  onOpenChange: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "running",
    label: "Running",
    note: "The call is in flight and has no result yet.",
    Component: () => <ToolCall {...base} running open={false} />,
  },
  {
    key: "expanded",
    label: "Expanded",
    note: "A finished call opened to show its request and result.",
    Component: () => <ToolCall {...base} running={false} open />,
  },
  {
    key: "long-content",
    label: "Long input",
    note: "A long query truncates in the header, while the request and result wrap inside the same width.",
    Component: () => (
      <ToolCall
        {...base}
        label="Searched the docs"
        query="how do I persist a composer draft across reloads when the thread is remote"
        request={JSON.stringify({
          query:
            "how do I persist a composer draft across reloads when the thread is remote",
          limit: 10,
          sections: ["runtime", "guides", "api-reference"],
        })}
        result={[
          "10 matches",
          "/docs/runtime/drafts",
          "/docs/guides/persistence",
          "/docs/api-reference/primitives/composer",
          "/docs/runtime/remote-thread-list",
        ].join(", ")}
        running={false}
        open
      />
    ),
  },
]);
