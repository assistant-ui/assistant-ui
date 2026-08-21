"use client";

import type { ReactNode } from "react";
import {
  BotIcon,
  Code2Icon,
  CopyIcon,
  FileTextIcon,
  PlugIcon,
  PlusIcon,
  SparklesIcon,
} from "lucide-react";
import type { SyntaxHighlighterProps } from "@assistant-ui/react-markdown";
import { cn } from "@/lib/utils";
import { Thread } from "@/components/assistant-ui/elements/thread";
import { VoiceOrb } from "@/components/assistant-ui/elements/voice";
import { ThreadList } from "@/components/assistant-ui/elements/thread-list.kit";
import { AssistantSidebar } from "@/components/assistant-ui/elements/assistant-sidebar";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { SyntaxHighlighter as PrismSyntaxHighlighter } from "@/components/assistant-ui/elements/syntax-highlighter";
import {
  OpenAILogo,
  ClaudeLogo,
  GeminiLogo,
} from "@/components/assistant-ui/elements/logos";
import { HeatGraph } from "@/components/assistant-ui/elements/heat-graph";
import { SampleRuntimeProvider } from "@/components/pages/docs/samples/sample-runtime-provider";
import { AssistantModalSample } from "@/components/pages/docs/samples/assistant-modal";
import { AttachmentSample } from "@/components/pages/docs/samples/attachment";
import { ContextDisplaySample } from "@/components/pages/docs/samples/context-display";
import { FollowUpSuggestionsSample } from "@/components/pages/docs/samples/follow-up-suggestions";
import { MessageTimingSample } from "@/components/pages/docs/samples/message-timing";
import { ModelSelectorSample } from "@/components/pages/docs/samples/model-selector";
import { ReasoningSample } from "@/components/pages/docs/samples/reasoning";
import { ThreadListSample } from "@/components/pages/docs/samples/threadlist";
import { ToolFallbackSample } from "@/components/pages/docs/samples/tool-fallback";
import { ToolGroupSample } from "@/components/pages/docs/samples/tool-group";
import { QuoteSample } from "@/components/pages/docs/samples/quote";
import { SourcesSample } from "@/components/pages/docs/samples/sources";
import { ImageSample } from "@/components/pages/docs/samples/image";
import { FileSample } from "@/components/pages/docs/samples/file";
import { ComposerTriggerPopoverSample } from "@/components/pages/docs/samples/composer-trigger-popover";
import { DirectiveTextSample } from "@/components/pages/docs/samples/directive-text";
import { MarkdownSample } from "@/components/pages/docs/samples/markdown";
import { SyntaxHighlightingSample } from "@/components/pages/docs/samples/syntax-highlighting";
import { MermaidSample } from "@/components/pages/docs/samples/mermaid";
import { GenerativeWeatherCurrentDemo } from "./generative-demos";

const sampleClassName =
  "[&_.not-prose]:m-0! [&_.not-prose]:h-full [&_.not-prose]:w-full [&_.not-prose>div]:h-full! [&_.not-prose>div]:min-h-0!";

function DemoSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full min-w-0 items-center justify-center overflow-hidden",
        sampleClassName,
        className,
      )}
    >
      {children}
    </div>
  );
}

function RuntimeDemo({ children }: { children: ReactNode }) {
  return (
    <SampleRuntimeProvider>
      <DemoSurface>{children}</DemoSurface>
    </SampleRuntimeProvider>
  );
}

function SampleDemo({ children }: { children: ReactNode }) {
  return <DemoSurface>{children}</DemoSurface>;
}

export function AuiThreadDemo() {
  return (
    <SampleRuntimeProvider>
      <DemoSurface className="bg-muted/40">
        <div className="h-full w-full">
          <Thread />
        </div>
      </DemoSurface>
    </SampleRuntimeProvider>
  );
}

export function AuiVoiceDemo() {
  return (
    <RuntimeDemo>
      <div className="flex flex-col items-center gap-5">
        <VoiceOrb state="speaking" variant="blue" className="size-32" />
        <span className="text-muted-foreground text-sm font-medium">
          Speaking
        </span>
      </div>
    </RuntimeDemo>
  );
}

export function AuiReasoningDemo() {
  return (
    <RuntimeDemo>
      <ReasoningSample />
    </RuntimeDemo>
  );
}

export function AuiMessageTimingDemo() {
  return (
    <SampleDemo>
      <MessageTimingSample />
    </SampleDemo>
  );
}

export function AuiContextDisplayDemo() {
  return (
    <SampleDemo>
      <ContextDisplaySample />
    </SampleDemo>
  );
}

export function AuiThreadListDemo() {
  return (
    <SampleRuntimeProvider>
      <DemoSurface>
        <div className="bg-background h-full w-full max-w-72 overflow-hidden rounded-2xl shadow-sm">
          <ThreadList />
        </div>
      </DemoSurface>
    </SampleRuntimeProvider>
  );
}

export function AuiMcpConfigDemo() {
  return (
    <SampleDemo>
      <div className="bg-background w-full max-w-lg rounded-2xl border p-5 shadow-sm">
        <div>
          <h4 className="text-sm font-semibold">MCP servers</h4>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Connect servers to expose their tools to this assistant.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-4">
          <div>
            <p className="text-xs font-medium">Connectors</p>
            <div className="text-muted-foreground mt-2 flex items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-xs">
              <PlugIcon className="size-3.5" />
              No connectors configured
            </div>
          </div>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-medium">Custom servers</p>
              <button
                type="button"
                className="hover:bg-accent inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors"
              >
                <PlusIcon className="size-3.5" />
                Add server
              </button>
            </div>
          </div>
        </div>
      </div>
    </SampleDemo>
  );
}

export function AuiAttachmentDemo() {
  return (
    <SampleDemo>
      <AttachmentSample />
    </SampleDemo>
  );
}

export function AuiFollowUpSuggestionsDemo() {
  return (
    <SampleDemo>
      <FollowUpSuggestionsSample />
    </SampleDemo>
  );
}

export function AuiAssistantModalDemo() {
  return (
    <RuntimeDemo>
      <AssistantModalSample />
    </RuntimeDemo>
  );
}

export function AuiAssistantSidebarDemo() {
  return (
    <SampleRuntimeProvider>
      <DemoSurface className="bg-background">
        <AssistantSidebar>
          <div className="bg-muted/30 flex h-full items-center justify-center p-6 text-center">
            <div>
              <BotIcon className="text-foreground/35 mx-auto size-6" />
              <p className="mt-3 text-sm font-medium">Workspace</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Resize the assistant beside your app.
              </p>
            </div>
          </div>
        </AssistantSidebar>
      </DemoSurface>
    </SampleRuntimeProvider>
  );
}

export function AuiToolFallbackDemo() {
  return (
    <RuntimeDemo>
      <ToolFallbackSample />
    </RuntimeDemo>
  );
}

export function AuiToolGroupDemo() {
  return (
    <RuntimeDemo>
      <ToolGroupSample />
    </RuntimeDemo>
  );
}

export function AuiThreadListSidebarDemo() {
  return (
    <RuntimeDemo>
      <ThreadListSample />
    </RuntimeDemo>
  );
}

export function AuiQuoteDemo() {
  return (
    <SampleDemo>
      <QuoteSample />
    </SampleDemo>
  );
}

export function AuiSourcesDemo() {
  return (
    <SampleDemo>
      <SourcesSample />
    </SampleDemo>
  );
}

export function AuiImageDemo() {
  return (
    <SampleDemo>
      <ImageSample />
    </SampleDemo>
  );
}

export function AuiFileDemo() {
  return (
    <SampleDemo>
      <FileSample />
    </SampleDemo>
  );
}

export function AuiModelSelectorDemo() {
  return (
    <RuntimeDemo>
      <ModelSelectorSample />
    </RuntimeDemo>
  );
}

export function AuiComposerTriggerPopoverDemo() {
  return (
    <RuntimeDemo>
      <ComposerTriggerPopoverSample />
    </RuntimeDemo>
  );
}

export function AuiDirectiveTextDemo() {
  return (
    <RuntimeDemo>
      <DirectiveTextSample />
    </RuntimeDemo>
  );
}

export function AuiMarkdownTextDemo() {
  return (
    <SampleDemo>
      <MarkdownSample />
    </SampleDemo>
  );
}

const sampleCode = `export function Assistant() {
  return <Thread />;
}`;

const syntaxComponents: SyntaxHighlighterProps["components"] = {
  Pre: ({ node: _, ...props }) => <pre {...props} />,
  Code: ({ node: _, ...props }) => <code {...props} />,
};

export function AuiSyntaxHighlighterDemo() {
  return (
    <SampleDemo>
      <div className="w-full max-w-xl overflow-hidden rounded-xl">
        <div className="bg-muted text-muted-foreground flex items-center justify-between px-4 py-2 text-xs">
          <span>tsx</span>
          <CopyIcon className="size-3.5" />
        </div>
        <PrismSyntaxHighlighter
          language="tsx"
          code={sampleCode}
          components={syntaxComponents}
        />
      </div>
    </SampleDemo>
  );
}

export function AuiShikiHighlighterDemo() {
  return (
    <RuntimeDemo>
      <SyntaxHighlightingSample />
    </RuntimeDemo>
  );
}

export function AuiMermaidDiagramDemo() {
  return (
    <SampleDemo>
      <MermaidSample />
    </SampleDemo>
  );
}

export function AuiGenerativeUIDemo() {
  return (
    <SampleDemo>
      <div data-aui-theme="elements" className="aui-gallery scale-[0.85]">
        <GenerativeWeatherCurrentDemo />
      </div>
    </SampleDemo>
  );
}

export function AuiTooltipIconButtonDemo() {
  return (
    <SampleDemo>
      <div className="flex items-center gap-3">
        <TooltipIconButton tooltip="Generate" variant="outline">
          <SparklesIcon />
        </TooltipIconButton>
        <TooltipIconButton tooltip="View code" variant="outline">
          <Code2Icon />
        </TooltipIconButton>
        <TooltipIconButton tooltip="Open file" variant="outline">
          <FileTextIcon />
        </TooltipIconButton>
      </div>
    </SampleDemo>
  );
}

export function AuiLogosDemo() {
  return (
    <SampleDemo>
      <div className="flex items-center gap-10">
        <OpenAILogo className="size-9" />
        <ClaudeLogo className="size-9" />
        <GeminiLogo className="size-9" />
      </div>
    </SampleDemo>
  );
}

const heatGraphData = Array.from({ length: 112 }, (_, index) => ({
  date: new Date(2026, 0, index + 1),
  count: (index * 7 + Math.floor(index / 9)) % 18,
}));

export function AuiHeatGraphDemo() {
  return (
    <SampleDemo>
      <div className="w-full max-w-2xl min-w-125 scale-[0.82]">
        <HeatGraph data={heatGraphData} />
      </div>
    </SampleDemo>
  );
}
