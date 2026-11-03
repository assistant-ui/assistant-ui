"use client";

import { MessageQueue } from "@/components/assistant-ui/elements/message-queue";
import { defineStates } from "./types";

const noop = () => {};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "empty",
    label: "Nothing queued",
    note: "A run is in flight and the user has not typed anything else yet.",
    Component: () => (
      <MessageQueue
        running="Fix the converter and add a guard"
        queued={[]}
        onCancel={noop}
      />
    ),
  },
  {
    key: "disabled",
    label: "Locked",
    note: "Without a cancel handler the queued turns cannot be removed.",
    Component: () => (
      <MessageQueue
        running="Fix the converter and add a guard"
        queued={[
          { id: "a", text: "Also add a changeset" },
          { id: "b", text: "Then run the full suite" },
        ]}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long queue",
    note: "Long turns truncate to one line and the list keeps growing downward.",
    Component: () => (
      <MessageQueue
        running="Migrate every package in the monorepo from tsup to tsdown and keep the exports maps identical"
        queued={[
          {
            id: "a",
            text: "After that, bump the peer dependency on react to 19 in every package that still says 18",
          },
          { id: "b", text: "Add a changeset for each package you touched" },
          { id: "c", text: "Run pnpm turbo build --filter=./packages/*" },
          { id: "d", text: "Then run the full test suite" },
          {
            id: "e",
            text: "Open the PR against main and request review from the maintainers",
          },
        ]}
        onCancel={noop}
      />
    ),
  },
]);
