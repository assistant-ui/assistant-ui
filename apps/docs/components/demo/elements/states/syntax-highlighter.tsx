"use client";

import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import { SyntaxHighlighter } from "@/components/assistant-ui/elements/syntax-highlighter";
import { defineStates } from "./types";

const components: SyntaxHighlighterProps["components"] = {
  Pre: ({ node: _, ...props }) => <pre {...props} />,
  Code: ({ node: _, ...props }) => <code {...props} />,
};

function Block({ language, code }: { language: string; code: string }) {
  return (
    <div className="w-full max-w-xl overflow-hidden rounded-xl">
      <div className="bg-muted text-muted-foreground px-4 py-2 text-xs">
        {language}
      </div>
      <SyntaxHighlighter
        language={language}
        code={code}
        components={components}
      />
    </div>
  );
}

const PYTHON = `import httpx

async def fetch_forecast(city: str) -> dict:
    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get("https://api.weather.dev/v1/forecast", params={"q": city})
        res.raise_for_status()
        return res.json()`;

const RUST = `fn main() {
    let names = vec!["ada", "grace", "linus"];
    for name in names.iter().filter(|n| n.len() > 3) {
        println!("hello, {name}");
    }
}`;

const LONG_LINE = `export const config = { runtime: "edge", regions: ["iad1", "sfo1", "fra1", "hnd1"], maxDuration: 30, headers: { "cache-control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800" } };`;

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "python",
    label: "Python",
    note: "A second registered language, highlighted with its own grammar.",
    Component: () => <Block language="python" code={PYTHON} />,
  },
  {
    key: "unknown-language",
    label: "Unregistered",
    note: "A language with no registered grammar renders as plain monospace text.",
    Component: () => <Block language="rust" code={RUST} />,
  },
  {
    key: "long-content",
    label: "Long line",
    note: "A line wider than the block scrolls sideways instead of wrapping.",
    Component: () => <Block language="ts" code={LONG_LINE} />,
  },
]);
