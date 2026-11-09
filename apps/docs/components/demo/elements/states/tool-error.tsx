"use client";

import { ToolError } from "@/components/assistant-ui/elements/tool-error";
import { defineStates } from "./types";

const noop = () => {};

const base = {
  name: "fetch",
  target: "https://api.example.com/v1/issues",
  message: "ETIMEDOUT after 30000ms",
  maxAttempts: 3,
  onRetry: noop,
  onSkip: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "retrying",
    label: "Retrying",
    note: "A retry is in flight, so the button spins and cannot be pressed again.",
    Component: () => <ToolError {...base} attempt={2} retrying />,
  },
  {
    key: "final-attempt",
    label: "Final attempt",
    note: "The last allowed attempt also failed.",
    Component: () => (
      <ToolError
        {...base}
        attempt={3}
        retrying={false}
        message="503 Service Unavailable: upstream connect error or disconnect/reset before headers"
      />
    ),
  },
  {
    key: "no-skip",
    label: "Required",
    note: "Without a skip handler the call has to succeed, so Skip is disabled.",
    Component: () => (
      <ToolError
        name="write_file"
        target="packages/react/src/index.ts"
        message="EACCES: permission denied, open 'packages/react/src/index.ts'"
        attempt={1}
        maxAttempts={3}
        retrying={false}
        onRetry={noop}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long error",
    note: "A long target truncates and a long stack trace wraps inside the error box.",
    Component: () => (
      <ToolError
        name="postgres.query"
        target="postgresql://readonly@db.internal.acme.dev:5432/analytics?sslmode=require"
        message={
          'error: relation "events_2026_11" does not exist at character 15\n    at Parser.parseErrorMessage (node_modules/pg-protocol/dist/parser.js:287:98)\n    at Parser.handlePacket (node_modules/pg-protocol/dist/parser.js:126:29)\n    at Socket.<anonymous> (node_modules/pg-protocol/dist/index.js:11:42)'
        }
        attempt={1}
        maxAttempts={5}
        retrying={false}
        onRetry={noop}
        onSkip={noop}
      />
    ),
  },
]);
