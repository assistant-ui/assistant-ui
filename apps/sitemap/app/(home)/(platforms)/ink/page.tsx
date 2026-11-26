import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageFrame } from "@/components/shared/page-frame";
import { DemoSetupPanel } from "@/components/shared/demo-setup-panel";
import { PageHero } from "@/components/shared/page-hero";
import { LiveFrame } from "@/components/pages/platforms/live-frame";
import { subProject } from "@/lib/docs-sites";

const { title, description } = subProject("ink");

export const metadata: Metadata = { title, description };

const INK_DEMO =
  process.env["NEXT_PUBLIC_INK_DEMO_URL"] ??
  "https://assistant-ui-ink.vercel.app";

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

export default function InkPage() {
  return (
    <PageFrame pad="sub">
      <PageHero
        title="AI chat, in the terminal."
        deck="Thread, Composer, and Message primitives for Ink. The same runtime and adapters as the web SDK, rendered in ANSI."
        primary={{ label: "Read the docs", href: "/docs/ink" }}
        secondary={{ install: "npx assistant-ui@latest create --ink my-app" }}
        showcase={
          <DemoSetupPanel
            frameClassName="h-[34rem]"
            demo={
              <LiveFrame
                src={INK_DEMO}
                title="assistant-ui Ink demo"
                className="size-full rounded-none border-0"
              />
            }
            demoCaption="A real Ink render loop. Click and type."
            files={[{ path: "app.tsx", language: "tsx", code: SNIPPET }]}
            setupCaption="Abridged from examples/with-react-ink."
          />
        }
      />
      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="border-foreground/10 border-b py-10 md:py-12">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">The primitives</p>
            <span className="text-muted-foreground text-sm tabular-nums">
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
            href="/react"
            className="text-foreground font-medium transition-colors"
          >
            web
          </Link>
          ,{" "}
          <Link
            href="/react-native"
            className="text-foreground font-medium transition-colors"
          >
            React Native
          </Link>
          , and{" "}
          <Link
            href="/vue"
            className="text-foreground font-medium transition-colors"
          >
            Vue
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
