"use client";

import { useState } from "react";
import type { ErrorDoc } from "../errors";

type Props = {
  errorId: string;
  doc: ErrorDoc;
  info?: Record<string, unknown>;
};

const buildPrompt = (doc: ErrorDoc, info?: Record<string, unknown>) => {
  let prompt = doc.fixPrompt;

  if (info) {
    const { stack, ...rest } = info;
    if (Object.keys(rest).length > 0) {
      prompt += `\n\nAdditional context:\n${JSON.stringify(rest, null, 2)}`;
    }
    if (stack) {
      prompt += `\n\nStack trace:\n${stack}`;
    }
  }

  return prompt;
};

export function SdkErrorContent({ errorId, doc, info }: Props) {
  const prompt = buildPrompt(doc, info);
  const cliCommand = `npx assistant-ui agent "${prompt.replace(/"/g, '\\"')}"`;
  const [activeTab, setActiveTab] = useState<"cli" | "prompt">("cli");
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-2 font-mono text-muted-foreground text-sm">
        {errorId}
      </div>
      <h1 className="mb-4 font-medium text-2xl tracking-tight md:text-3xl">
        {doc.title}
      </h1>
      <p className="mb-10 text-muted-foreground md:text-lg">
        {doc.description}
      </p>

      {doc.sections.map((section) => (
        <section key={section.heading} className="mb-8">
          <h2 className="mb-3 font-medium text-lg">{section.heading}</h2>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <FormattedContent content={section.content} />
          </div>
        </section>
      ))}

      <section className="mt-12 rounded-lg border bg-card p-6">
        <h2 className="mb-1 font-medium text-lg">Fix with AI</h2>
        <p className="mb-4 text-muted-foreground text-sm">
          Use the assistant-ui agent or copy the prompt to your AI tool of
          choice.
        </p>

        <div className="flex gap-1 border-b">
          <button
            type="button"
            onClick={() => setActiveTab("cli")}
            className={`px-3 py-2 text-sm transition-colors ${
              activeTab === "cli"
                ? "border-foreground border-b-2 font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            CLI Command
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("prompt")}
            className={`px-3 py-2 text-sm transition-colors ${
              activeTab === "prompt"
                ? "border-foreground border-b-2 font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Prompt
          </button>
        </div>

        <div className="relative mt-4">
          <pre className="overflow-x-auto rounded-md bg-muted p-4 font-mono text-sm">
            <code>{activeTab === "cli" ? cliCommand : prompt}</code>
          </pre>
          <button
            type="button"
            onClick={() =>
              copyToClipboard(activeTab === "cli" ? cliCommand : prompt)
            }
            className="absolute top-2 right-2 rounded-md border bg-background px-2 py-1 text-xs transition-colors hover:bg-muted"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </section>

      {info && Object.keys(info).length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-muted-foreground text-sm hover:text-foreground">
            Error details
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-muted p-4 font-mono text-xs">
            {JSON.stringify(info, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function FormattedContent({ content }: { content: string }) {
  // Split by code blocks and render them differently
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.split("\n");
          const lang = lines[0]?.replace("```", "").trim();
          const code = lines.slice(1, -1).join("\n");
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-md bg-muted p-4 font-mono text-sm"
            >
              {lang && (
                <div className="mb-2 text-muted-foreground text-xs">{lang}</div>
              )}
              <code>{code}</code>
            </pre>
          );
        }
        return (
          <div key={i}>
            {part.split("\n\n").map((paragraph, j) => {
              if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
                return (
                  <p key={j} className="font-medium">
                    {paragraph.slice(2, -2)}
                  </p>
                );
              }
              if (paragraph.startsWith("**")) {
                const boldEnd = paragraph.indexOf("**", 2);
                if (boldEnd !== -1) {
                  return (
                    <p key={j}>
                      <strong>{paragraph.slice(2, boldEnd)}</strong>
                      {paragraph.slice(boldEnd + 2)}
                    </p>
                  );
                }
              }
              if (paragraph.trim()) {
                return <p key={j}>{renderInlineCode(paragraph)}</p>;
              }
              return null;
            })}
          </div>
        );
      })}
    </>
  );
}

function renderInlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-muted px-1 py-0.5 font-mono text-sm"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
