"use client";

import { ConnectionState } from "@/components/assistant-ui/elements/connection-state";
import { defineStates } from "./types";

const noop = () => {};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "error",
    label: "Dropped",
    note: "The connection dropped while the run continues on the server.",
    Component: () => <ConnectionState phase="dropped" onRetry={noop} />,
  },
  {
    key: "pending",
    label: "Reconnecting",
    note: "A retry is in progress, on its third attempt.",
    Component: () => <ConnectionState phase="reconnecting" attempt={3} />,
  },
  {
    key: "pending-no-count",
    label: "No count",
    note: "Reconnecting without an attempt number to show.",
    Component: () => <ConnectionState phase="reconnecting" />,
  },
  {
    key: "success",
    label: "Resumed",
    note: "The stream picked back up with the tokens it missed.",
    Component: () => <ConnectionState phase="resumed" resumedTokens={1248} />,
  },
]);
