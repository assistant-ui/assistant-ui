"use client";

import { MermaidDiagram } from "@/components/assistant-ui/elements/mermaid-diagram";
import { defineStates } from "./types";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-xl overflow-hidden rounded-lg">
      <div className="bg-muted-foreground/15 text-foreground dark:bg-muted-foreground/20 rounded-t-lg px-4 py-2 text-sm font-semibold">
        mermaid
      </div>
      {children}
    </div>
  );
}

const SEQUENCE = `sequenceDiagram
    participant U as User
    participant A as Assistant
    participant T as search_docs
    U->>A: How do I persist drafts?
    A->>T: query "draft persistence"
    T-->>A: 3 matches
    A-->>U: Use the thread list adapter`;

const PARTIAL = `graph TD
    A[Request] --> B{Cached?}
    B -->|Yes| C[Return cached]
    B -->|No| `;

const UNSUPPORTED = `pie title Traffic by region
    "North America" : 48
    "Europe" : 31
    "Asia Pacific" : 21`;

const LARGE = `graph LR
    A[Push] --> B[Install]
    B --> C[Lint]
    B --> D[Typecheck]
    B --> E[Unit tests]
    C --> F[Build]
    D --> F
    E --> F
    F --> G[Preview deploy]
    G --> H{Checks pass?}
    H -->|Yes| I[Promote to production]
    H -->|No| J[Notify author]
    I --> K[Purge CDN]
    K --> L[Post release notes]`;

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "streaming",
    label: "Streaming",
    note: "While the message part streams, a skeleton holds the diagram's place.",
    Component: () => (
      <Frame>
        <MermaidDiagram code={PARTIAL} streaming />
      </Frame>
    ),
  },
  {
    key: "partial",
    label: "Incomplete",
    note: "Source that ends on a dangling edge falls back to the raw code.",
    Component: () => (
      <Frame>
        <MermaidDiagram code={PARTIAL} />
      </Frame>
    ),
  },
  {
    key: "error",
    label: "Unsupported",
    note: "A diagram type the renderer cannot draw shows the code with a short notice.",
    Component: () => (
      <Frame>
        <MermaidDiagram code={UNSUPPORTED} />
      </Frame>
    ),
  },
  {
    key: "sequence",
    label: "Sequence",
    note: "A sequence diagram renders through the same component as flowcharts.",
    Component: () => (
      <Frame>
        <MermaidDiagram code={SEQUENCE} />
      </Frame>
    ),
  },
  {
    key: "long-content",
    label: "Large graph",
    note: "A wide pipeline graph scales down to fit and can be opened to zoom.",
    Component: () => (
      <Frame>
        <MermaidDiagram code={LARGE} />
      </Frame>
    ),
  },
]);
