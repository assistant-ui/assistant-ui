import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  Database,
  Feather,
  MessagesSquare,
  Palette,
  Plug,
  Waves,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { DemoSetupPanel } from "@/components/shared/demo-setup-panel";
import { PageFrame } from "@/components/shared/page-frame";
import { PageHero } from "@/components/shared/page-hero";
import { typeDeck, typeSection } from "@/components/shared/type";
import { BridgeDiagram } from "@/components/pages/docs/samples/generative-frame/diagrams";
import { GenerativeFrameDemo } from "@/components/pages/docs/samples/generative-frame/live-demo";
import { subProject } from "@/lib/docs-sites";
import { cn } from "@/lib/utils";

const { title, description } = subProject("generative-frame");

export const metadata: Metadata = { title, description };

const USE_CASES = [
  {
    name: "Widgets the model writes",
    copy: "Charts, diagrams, and small tools in HTML or SVG, run in a sandboxed frame.",
    api: "show_widget",
    href: "/generative-frame/docs/tools",
  },
  {
    name: "UI from your components",
    copy: "The model streams a JSON spec, and your own components render it. No model code runs.",
    api: "render_spec",
    href: "/generative-frame/docs/spec-mode",
  },
] as const;

/* Each feature maps to public API in packages/generative-frame/src. */
const FEATURES = [
  {
    title: "Streams as it’s written",
    icon: Waves,
    body: "Partial markup renders as it arrives. Scripts run once the code is complete.",
    api: "write(), end()",
  },
  {
    title: "Your theme",
    icon: Palette,
    body: "Your page’s CSS variables become tokens in the frame, and follow theme changes.",
    api: "readThemeTokens(), setTheme()",
  },
  {
    title: "MCP Apps compatible",
    icon: Plug,
    body: "The frame speaks the MCP Apps ui/* protocol, so MCP Apps widgets render too.",
    api: "ui/initialize, ui/message",
  },
  {
    title: "Screenshots and repair",
    icon: Wrench,
    body: "Errors, console output, blank renders, and a PNG go back to the model to fix.",
    api: "previewWidget(), repairLoop()",
  },
  {
    title: "Spec mode",
    icon: Blocks,
    body: "JSON patches against a catalog of your components, validated as they stream.",
    api: "defineCatalog(), <SpecRenderer>",
  },
  {
    title: "Storage that persists",
    icon: Database,
    body: "Give a widget an id and its localStorage survives reloads. Clear it from the host.",
    api: "id, clearWidgetStorage()",
  },
  {
    title: "assistant-ui toolkit",
    icon: MessagesSquare,
    body: "Widget tool calls render in the thread while their arguments stream.",
    api: "createWidgetToolkit()",
  },
  {
    title: "Works without assistant-ui",
    icon: Feather,
    body: "The core is plain JavaScript. The React and assistant-ui entries are optional.",
    api: "createWidget()",
  },
] satisfies {
  title: string;
  icon: LucideIcon;
  body: string;
  api: string;
}[];

const REACT_SNIPPET = `import { Widget, useThemeTokens } from "generative-frame/react";

function GeneratedWidget({
  code,
  streaming,
}: {
  code: string;
  streaming: boolean;
}) {
  const tokens = useThemeTokens();
  return (
    <Widget
      code={code}
      streaming={streaming}
      tokens={tokens}
      maxHeight={640}
      onPrompt={(text) => sendChatMessage(text)}
    />
  );
}`;

const CORE_SNIPPET = `import { createWidget, readThemeTokens } from "generative-frame";

const widget = createWidget({
  container: document.getElementById("widget")!,
  tokens: readThemeTokens(),
  maxHeight: 640,
  onPrompt: (text) => sendChatMessage(text),
  onError: (error) => console.warn(\`[widget] \${error.kind}: \${error.message}\`),
});

for await (const chunk of modelStream) {
  widget.write(chunk);
}

const { size, blank, errorCount } = await widget.end();`;

const ASSISTANT_UI_SNIPPET = `"use client";

import type { ReactNode } from "react";
import { AssistantRuntimeProvider, AuiConfig, Tools } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import {
  createWidgetToolkit,
  useWidgetInstructions,
} from "generative-frame/assistant-ui";

const widgets = createWidgetToolkit({ widget: { maxHeight: 700 } });
const config = AuiConfig({ tools: Tools({ toolkit: widgets.toolkit }) });

export function Provider({ children }: { children: ReactNode }) {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });
  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <WidgetInstructions />
      {children}
    </AssistantRuntimeProvider>
  );
}

function WidgetInstructions() {
  useWidgetInstructions(widgets.tools);
  return null;
}`;

/*
 * The live demo brings its own figure: a tinted panel, then a row with its
 * status and controls. In the demo frame the panel drops its tint and fills
 * the frame, the row becomes the frame's header row, and the figure's own
 * caption moves to the frame's caption line.
 */
const demoFit = cn(
  "h-full",
  "[&>figure]:flex [&>figure]:h-full [&>figure]:max-w-none [&>figure]:flex-col",
  "[&>figure>div:first-child]:min-h-0 [&>figure>div:first-child]:flex-1 [&>figure>div:first-child]:grid-rows-[auto_minmax(0,1fr)] [&>figure>div:first-child]:rounded-none [&>figure>div:first-child]:bg-transparent md:[&>figure>div:first-child]:grid-rows-[minmax(0,1fr)]",
  "[&>figure>div:first-child>div:last-child]:min-h-0 [&>figure>div:first-child>div:last-child]:overflow-y-auto",
  "[&_pre]:h-28 md:[&_pre]:h-auto md:[&_pre]:min-h-0 md:[&_pre]:flex-1",
  "[&>figure>div:last-child]:border-foreground/10 [&>figure>div:last-child]:order-first [&>figure>div:last-child]:mt-0 [&>figure>div:last-child]:min-h-11 [&>figure>div:last-child]:shrink-0 [&>figure>div:last-child]:border-b [&>figure>div:last-child]:px-4 [&>figure>div:last-child]:py-1.5",
  "[&_figcaption>span:first-child]:hidden",
);

const field =
  "bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document";
const mono = "font-mono [font-variant-ligatures:none]";

export default function GenerativeFramePage() {
  return (
    <PageFrame pad="sub">
      <PageHero
        title="Widgets that stream from the model."
        deck="Render model-written HTML and SVG while it streams, each widget in a sandboxed frame on its own domain, in your app’s theme."
        primary={{ label: "Read the docs", href: "/generative-frame/docs" }}
        secondary={{ install: "npm install generative-frame" }}
        showcase={
          <DemoSetupPanel
            demo={
              <div className={demoFit}>
                <GenerativeFrameDemo />
              </div>
            }
            demoCaption="A recorded show_widget call, replayed into a live frame."
            files={[
              { path: "widget.tsx", language: "tsx", code: REACT_SNIPPET },
              { path: "main.ts", language: "ts", code: CORE_SNIPPET },
              {
                path: "provider.tsx",
                language: "tsx",
                code: ASSISTANT_UI_SNIPPET,
              },
            ]}
            setupCaption="From the React, Quickstart, and With assistant-ui guides."
            frameClassName="h-[42rem] md:h-[36rem]"
          />
        }
      />

      <section className="mt-24 md:mt-32">
        <h2 className={typeSection}>Two ways to draw a widget</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {USE_CASES.map((useCase) => (
            <Link
              key={useCase.name}
              href={useCase.href}
              className={cn(
                field,
                "group hover:bg-foreground/[0.05] dark:hover:bg-foreground/[0.07] flex flex-col p-6 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 sm:p-10",
              )}
            >
              <h3 className={typeSection}>{useCase.name}</h3>
              <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
                {useCase.copy}
              </p>
              <div className="mt-6 flex items-end justify-between gap-6">
                <span className={cn(mono, "text-muted-foreground/80 text-xs")}>
                  {useCase.api}
                </span>
                <ArrowRight
                  aria-hidden
                  className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-24 md:mt-32">
        <h2 className={typeSection}>How a widget streams</h2>
        <p className={cn(typeDeck, "mt-3 max-w-[60ch]")}>
          Each widget is a{" "}
          <Link
            href="/safe-content-frame"
            className="text-foreground underline underline-offset-4"
          >
            Safe Content Frame
          </Link>{" "}
          that loads a small runtime once. Code then streams to the runtime over
          a private MessagePort.
        </p>
        <figure className="mt-10">
          <BridgeDiagram />
          <figcaption className="text-muted-foreground mt-4 text-xs">
            fig. 01 · your page, the port, and the runtime in its own frame
          </figcaption>
        </figure>
      </section>

      <section className="mt-24 md:mt-32">
        <h2 className={typeSection}>In the package</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, ...feature }) => (
            <div key={feature.title} className={cn(field, "flex flex-col p-6")}>
              <Icon
                aria-hidden
                className="text-muted-foreground size-[18px] shrink-0"
                strokeWidth={1.75}
              />
              <h3 className="mt-4 font-medium">{feature.title}</h3>
              <p className="text-muted-foreground mt-1 flex-1 text-sm leading-relaxed">
                {feature.body}
              </p>
              <p
                className={cn(
                  mono,
                  "text-muted-foreground/80 mt-5 text-xs break-words",
                )}
              >
                {feature.api}
              </p>
            </div>
          ))}
        </div>
      </section>
    </PageFrame>
  );
}
