"use client";

import { ErrorState } from "@/components/assistant-ui/elements/error-state";
import { defineStates } from "./types";

const noop = () => {};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "retrying",
    label: "Retrying",
    note: "The user pressed retry and the request is running again.",
    Component: () => (
      <ErrorState
        title="Generation stopped"
        detail="The model hit the output limit after 4,096 tokens."
        retrying
        onRetry={noop}
      />
    ),
  },
  {
    key: "network",
    label: "Network error",
    note: "The connection dropped before the first token arrived.",
    Component: () => (
      <ErrorState
        title="Couldn't reach the server"
        detail="Check your connection and try again."
        retrying={false}
        onRetry={noop}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long detail",
    note: "A long provider message wraps under the title and keeps retry on the right.",
    Component: () => (
      <ErrorState
        title="Rate limit reached"
        detail="429 Too Many Requests: this organization exceeded 40,000 input tokens per minute for claude-sonnet-4-5. Wait about 30 seconds or lower the request size."
        retrying={false}
        onRetry={noop}
      />
    ),
  },
]);
