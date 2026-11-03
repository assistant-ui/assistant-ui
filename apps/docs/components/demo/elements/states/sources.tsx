"use client";

import {
  Source,
  SourceIcon,
  SourceTitle,
  Sources,
} from "@/components/assistant-ui/elements/sources.aui";
import { defineStates } from "./types";

const COMPLETE = { type: "complete" } as const;

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-lg flex-wrap items-center gap-2">
      {children}
    </div>
  );
}

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "no-title",
    label: "No title",
    note: "A URL source without a title falls back to its domain.",
    Component: () => (
      <Row>
        <Sources
          type="source"
          sourceType="url"
          id="src-1"
          url="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API"
          status={COMPLETE}
        />
        <Sources
          type="source"
          sourceType="url"
          id="src-2"
          url="https://nodejs.org/api/stream.html"
          status={COMPLETE}
        />
      </Row>
    ),
  },
  {
    key: "documents",
    label: "Documents",
    note: "Uploaded files render as document badges instead of links.",
    Component: () => (
      <Row>
        <Sources
          type="source"
          sourceType="document"
          id="doc-1"
          title="Q3 board deck.pdf"
          mediaType="application/pdf"
          status={COMPLETE}
        />
        <Sources
          type="source"
          sourceType="document"
          id="doc-2"
          title="pricing-2026.xlsx"
          mediaType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          status={COMPLETE}
        />
      </Row>
    ),
  },
  {
    key: "unsafe-url",
    label: "Unsafe URL",
    note: "A source with a non-http URL renders as plain text with no link.",
    Component: () => (
      <Row>
        <Sources
          type="source"
          sourceType="url"
          id="src-unsafe"
          url="javascript:alert(document.cookie)"
          title="Untrusted link"
          status={COMPLETE}
        />
      </Row>
    ),
  },
  {
    key: "icon-fallback",
    label: "No favicon",
    note: "When the favicon fails to load, the first letter of the domain stands in.",
    Component: () => (
      <Row>
        {[
          {
            url: "https://internal.acme.dev/runbooks/deploy",
            title: "Deploy runbook",
          },
          { url: "https://wiki.acme.dev/oncall", title: "On-call guide" },
        ].map((source) => (
          <Source key={source.url} href={source.url}>
            <SourceIcon url={source.url} faviconUrl={() => "data:,"} />
            <SourceTitle>{source.title}</SourceTitle>
          </Source>
        ))}
      </Row>
    ),
  },
  {
    key: "long-content",
    label: "Long titles",
    note: "Long titles truncate so many sources still fit on one line.",
    Component: () => (
      <Row>
        <Sources
          type="source"
          sourceType="url"
          id="src-long-1"
          url="https://react.dev/reference/react/useSyncExternalStore"
          title="useSyncExternalStore: subscribing to an external store from a component"
          status={COMPLETE}
        />
        <Sources
          type="source"
          sourceType="url"
          id="src-long-2"
          url="https://www.rfc-editor.org/rfc/rfc9110.html"
          title="RFC 9110: HTTP Semantics, Section 15.5.20 (421 Misdirected Request)"
          status={COMPLETE}
        />
        <Sources
          type="source"
          sourceType="document"
          id="doc-long"
          title="2026 vendor security questionnaire, final signed copy.pdf"
          mediaType="application/pdf"
          status={COMPLETE}
        />
      </Row>
    ),
  },
]);
