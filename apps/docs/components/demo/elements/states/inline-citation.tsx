"use client";

import {
  Citation,
  InlineCitation,
  type Source,
} from "@/components/assistant-ui/elements/inline-citation";
import { defineStates } from "./types";

const noop = () => {};

const RUNTIME: Source = {
  title: "Optimistic updates in the runtime",
  snippet:
    "The runtime applies local edits immediately and reconciles them once the server acknowledges the write.",
  url: "https://www.assistant-ui.com/docs/runtimes/custom/external-store",
  publishedAt: "2026-03-14",
};

const REACT: Source = {
  domain: "react.dev",
  title: "useSyncExternalStore reference",
  snippet:
    "Subscribes a component to an external store, re-rendering on every store change with a consistent snapshot.",
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "open",
    label: "Open",
    note: "A citation with its preview open, showing domain, date, and a link.",
    Component: () => (
      <InlineCitation>
        Optimistic updates keep the thread responsive while the server confirms
        the write
        <Citation index={0} source={RUNTIME} open onOpenChange={noop} />.
      </InlineCitation>
    ),
  },
  {
    key: "no-metadata",
    label: "No metadata",
    note: "A source with no URL, domain, or date shows only its title and snippet.",
    Component: () => (
      <InlineCitation>
        The team agreed to ship drafts behind a flag first
        <Citation
          index={0}
          source={{
            title: "Weekly sync notes, March 12",
            snippet:
              "Ship draft persistence behind a flag for one release, then turn it on by default.",
          }}
          open
          onOpenChange={noop}
        />
        .
      </InlineCitation>
    ),
  },
  {
    key: "many-sources",
    label: "Many sources",
    note: "One sentence backed by several sources in a row.",
    Component: () => (
      <InlineCitation>
        External stores keep every subscriber on the same snapshot
        <Citation index={0} source={RUNTIME} onOpenChange={noop} />
        <Citation index={1} source={REACT} onOpenChange={noop} />
        <Citation
          index={2}
          source={{
            domain: "github.com",
            title: "assistant-ui/assistant-ui#1842",
            snippet: "Move thread state to an external store with snapshots.",
          }}
          onOpenChange={noop}
        />
        <Citation
          index={3}
          source={{
            domain: "patterns.dev",
            title: "Derived state patterns",
            snippet: "Compute values from a single source of truth.",
          }}
          onOpenChange={noop}
        />
        , so no extra reconciliation pass is needed.
      </InlineCitation>
    ),
  },
  {
    key: "long-content",
    label: "Long snippet",
    note: "A long title and snippet stay inside the fixed preview width.",
    Component: () => (
      <InlineCitation>
        The external store adapter owns message state end to end
        <Citation
          index={0}
          source={{
            ...RUNTIME,
            title:
              "ExternalStoreRuntime: bring your own state management for messages, branches, and attachments",
            snippet:
              "Use the external store runtime when your app already keeps messages in Redux, Zustand, or a server cache. The runtime reads messages through a converter, sends new messages through onNew, and forwards edits, reloads, and cancellations to your handlers, so the store stays the single source of truth.",
          }}
          open
          onOpenChange={noop}
        />
        .
      </InlineCitation>
    ),
  },
]);
