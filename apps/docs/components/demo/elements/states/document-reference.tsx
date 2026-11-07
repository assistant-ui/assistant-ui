"use client";

import {
  DocumentReference,
  type DocumentAnchor,
} from "@/components/assistant-ui/elements/document-reference";
import { defineStates } from "./types";

const noop = () => {};

const ANCHORS: readonly DocumentAnchor[] = [
  {
    page: 4,
    quote:
      "The composer owns its draft; parent state that mirrored it is no longer read.",
  },
  {
    page: 9,
    quote:
      "Each thread keeps its own slot, cleared on switch rather than reused.",
  },
];

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "single",
    label: "One passage",
    note: "The answer cites a single passage from the document.",
    Component: () => (
      <DocumentReference
        title="security-review-2026-q3.pdf"
        pages={22}
        anchors={[
          {
            page: 17,
            quote:
              "Session tokens are rotated every 24 hours and revoked on password change.",
          },
        ]}
        activePage={17}
        onJump={noop}
      />
    ),
  },
  {
    key: "read-only",
    label: "Read only",
    note: "Without a jump handler the passages are plain text, not buttons.",
    Component: () => (
      <DocumentReference
        title="migration-0.14.pdf"
        pages={14}
        anchors={ANCHORS}
        activePage={4}
      />
    ),
  },
  {
    key: "same-page",
    label: "Same page",
    note: "Two passages from one page, with only the first marked current.",
    Component: () => (
      <DocumentReference
        title="migration-0.14.pdf"
        pages={14}
        anchors={[
          ANCHORS[0]!,
          {
            page: 4,
            quote:
              "Remove onChange handlers that wrote the draft back into parent state.",
          },
          ANCHORS[1]!,
        ]}
        activePage={4}
        onJump={noop}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long quote",
    note: "A long file name truncates and a long quote wraps in full.",
    Component: () => (
      <DocumentReference
        title="assistant-ui-runtime-architecture-and-migration-guide-v0.14-final-reviewed.pdf"
        pages={148}
        anchors={[
          {
            page: 112,
            quote:
              "When a thread is switched, the runtime detaches the previous composer, writes its pending draft to the per-thread slot, and only then mounts the next composer, so a draft is never visible in the wrong thread even for a single frame. Adapters that persist drafts remotely should debounce writes and treat the local slot as authoritative until the server acknowledges.",
          },
        ]}
        activePage={112}
        onJump={noop}
      />
    ),
  },
]);
