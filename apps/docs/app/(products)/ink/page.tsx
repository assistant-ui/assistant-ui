import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CopyCommandButton } from "@/components/shared/copy-command-button";
import { Highlight } from "@/components/shared/highlight";
import { CodeBlock } from "@/components/ui/code-block";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { TerminalDemo } from "./terminal-demo";

const ANALYTICS_PAGE = "ink" as const;

const PRIMITIVES = [
  "Thread",
  "ThreadList",
  "ThreadListItem",
  "Message",
  "MessagePart",
  "Composer",
  "TextInput",
  "ActionBar",
  "Attachment",
  "BranchPicker",
  "ChainOfThought",
  "Checklist",
  "Diff",
  "Error",
  "Loading",
  "QueueItem",
  "StatusBar",
  "Suggestion",
  "ToolCall",
] as const;

const FEATURES = [
  {
    title: "Built for Ink",
    description:
      "React components, ANSI color, and terminal layout. Same component model as the web SDK.",
  },
  {
    title: "ANSI markdown",
    description:
      "Headings, tables, links, and syntax-highlighted code via @assistant-ui/react-ink-markdown.",
  },
  {
    title: "Shared runtime",
    description:
      "The same engine as the web and React Native SDKs. Tools and adapters carry over.",
  },
] as const;

const SNIPPET = `import { useMemo } from "react";
import { render, Box, Text } from "ink";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  Tools,
  useLocalRuntime,
} from "@assistant-ui/react-ink";
import { Thread } from "./components/thread.js";
import { createAdapter } from "./adapter.js";
import toolkit from "./tools.js";

const App = () => {
  const adapter = useMemo(() => createAdapter(), []);
  const runtime = useLocalRuntime(adapter);
  const config = AuiConfig({ tools: Tools({ toolkit }) });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">
          demo-agent
        </Text>
        <Thread />
      </Box>
    </AssistantRuntimeProvider>
  );
};

render(<App />);`;

const SESSION_LINES: {
  text: React.ReactNode;
  dim?: boolean;
}[] = [
  {
    text: (
      <>
        <span className="font-medium text-[#56b6c2]">demo-agent</span>
        <span className="opacity-45"> ~/acme-app</span>
      </>
    ),
  },
  { text: "model: assistant-ui · 2 messages · streaming", dim: true },
  { text: " " },
  {
    text: (
      <>
        <span className="opacity-45">&gt; </span>what is assistant-ui?
      </>
    ),
  },
  { text: " " },
  { text: "A React library for AI chat" },
  { text: "with the same runtime as the" },
  { text: "web, rendered in ANSI:" },
  { text: " " },
  { text: <span className="font-medium">## In the terminal</span> },
  { text: " " },
  { text: "  • markdown and tables" },
  { text: "  • syntax-highlighted code" },
  { text: "  • tool calls with live status" },
  { text: " " },
  { text: "> search_docs · done", dim: true },
  {
    text: (
      <span className="inline-block h-[1.1em] w-[0.55em] translate-y-[0.15em] animate-pulse bg-[oklch(0.985_0.002_106)] motion-reduce:animate-none" />
    ),
  },
];

function RenderedSession() {
  return (
    <div className="border-foreground/10 flex-1 border bg-[oklch(0.17_0.003_106)] px-4 py-3.5 font-mono text-[12px] leading-[1.8] text-[oklch(0.985_0.002_106)]">
      {SESSION_LINES.map((line, index) => (
        <p
          key={index}
          className={cn("hero-rise", line.dim && "opacity-45")}
          style={{ animationDelay: `${150 + index * 140}ms` }}
        >
          {line.text}
        </p>
      ))}
    </div>
  );
}

export default function InkPage() {
  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>AI chat, in the terminal.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Thread, Composer, and Message primitives for Ink. The same runtime and
          adapters as the web SDK, rendered in ANSI.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <CopyCommandButton
            command="npx assistant-ui@latest create --ink my-app"
            analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
          />
          <Link
            href="/docs/ink"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Read the docs
          </Link>
        </div>
      </header>

      <figure className="mt-12 md:mt-16">
        <TerminalDemo />
        <figcaption className="text-muted-foreground/70 mt-2 flex items-baseline justify-between font-mono text-[11px] tracking-wide">
          <span>fig. 01</span>
          <span>a real Ink render loop — click and type</span>
        </figcaption>
      </figure>

      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="border-foreground/10 border-b py-10 md:py-12">
          <p className={typeEyebrow}>The setup</p>
          <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,42rem)_minmax(0,1fr)] lg:gap-14">
            <CodeBlock
              title="app.tsx · abridged from examples/with-react-ink"
              className="my-0"
            >
              <Highlight code={SNIPPET} language="tsx" />
            </CodeBlock>
            <figure className="flex flex-col">
              <RenderedSession />
              <figcaption className="text-muted-foreground/70 mt-2 flex items-baseline justify-between font-mono text-[11px] tracking-wide">
                <span>fig. 02</span>
                <span>what it renders</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="border-foreground/10 border-b py-10 md:py-12">
          <div className="flex items-baseline justify-between">
            <p className={typeEyebrow}>The primitives</p>
            <span className="text-muted-foreground/60 font-mono text-[11px] tracking-wide tabular-nums">
              {PRIMITIVES.length}
            </span>
          </div>
          <p className="text-muted-foreground mt-6 flex max-w-[52rem] flex-wrap gap-x-6 gap-y-2.5 font-mono text-[13px]">
            {PRIMITIVES.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </p>
          <p className="text-muted-foreground/70 mt-6 max-w-[52ch] text-sm leading-relaxed">
            Composable and unstyled — the web component model, adapted to rows,
            cells, and ANSI.
          </p>
        </section>

        <section className="divide-foreground/10 border-foreground/10 grid gap-8 border-b py-10 md:grid-cols-3 md:gap-0 md:divide-x md:py-12">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="md:px-8 md:first:ps-0 md:last:pe-0"
            >
              <h2 className="text-sm font-medium">{feature.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
                {feature.description}
              </p>
            </div>
          ))}
        </section>
      </div>

      <footer className="mt-16 flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          The same runtime ships for the{" "}
          <Link
            href="/docs"
            className="text-foreground font-medium transition-colors"
          >
            web
          </Link>{" "}
          and{" "}
          <Link
            href="/native"
            className="text-foreground font-medium transition-colors"
          >
            React Native
          </Link>
          .
        </p>
        <Link
          href="/docs/ink/migration"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Migration from web
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </footer>
    </PageFrame>
  );
}
