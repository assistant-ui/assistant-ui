"use client";

import { SyntaxHighlighter } from "@/components/assistant-ui/elements/shiki-highlighter.aui";
import { SyntaxHighlighter as BaseSyntaxHighlighter } from "@/components/assistant-ui/elements/shiki-highlighter";
import { defineStates } from "./types";

function Header({ language }: { language: string }) {
  return (
    <div className="bg-muted-foreground/15 text-foreground dark:bg-muted-foreground/20 rounded-t-lg px-4 py-2 text-sm font-semibold lowercase">
      {language}
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-xl overflow-hidden rounded-lg">{children}</div>
  );
}

const PARTIAL = `export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("ci`;

const SQL = `SELECT u.id, u.email, count(o.id) AS orders
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > now() - interval '30 days'
GROUP BY u.id
ORDER BY orders DESC
LIMIT 20;`;

const LONG_LINE = `const res = await fetch("https://api.example.com/v2/organizations/org_7Hq2/projects/prj_91kd/deployments?status=ready&limit=50&include=metadata,builds,aliases", { headers: { Authorization: \`Bearer \${token}\` } });`;

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "streaming",
    label: "Streaming",
    note: "While the message part streams, the code shows as plain text with no tokenizing.",
    Component: () => (
      <Frame>
        <Header language="typescript" />
        <BaseSyntaxHighlighter language="typescript" code={PARTIAL} streaming />
      </Frame>
    ),
  },
  {
    key: "highlighted-lines",
    label: "Marked lines",
    note: "Specific lines carry a highlight class to draw the eye.",
    Component: () => (
      <Frame>
        <Header language="sql" />
        <BaseSyntaxHighlighter
          language="sql"
          code={SQL}
          highlightLines={[4, 5]}
          className="[&_.highlighted]:inline-block [&_.highlighted]:w-full [&_.highlighted]:bg-amber-500/15"
        />
      </Frame>
    ),
  },
  {
    key: "plain-text",
    label: "Plain text",
    note: "A block tagged as plain text keeps the frame with no colors.",
    Component: () => (
      <Frame>
        <Header language="text" />
        <SyntaxHighlighter
          language="text"
          code={`$ pnpm build\n\n  Tasks:    12 successful, 12 total\n  Cached:   9 cached, 12 total\n  Time:     41.2s`}
        />
      </Frame>
    ),
  },
  {
    key: "long-content",
    label: "Long line",
    note: "A line wider than the block scrolls sideways instead of wrapping.",
    Component: () => (
      <Frame>
        <Header language="typescript" />
        <SyntaxHighlighter language="typescript" code={LONG_LINE} />
      </Frame>
    ),
  },
]);
