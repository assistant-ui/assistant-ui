"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import {
  groupPartByType,
  MessagePrimitive,
  MessagePartPrimitive,
  ThreadPrimitive,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import {
  BrainIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  WrenchIcon,
} from "lucide-react";
import { useState, type PropsWithChildren } from "react";
import { SampleRuntimeProvider } from "./sample-runtime-provider";

const sampleMessages: ThreadMessageLike[] = [
  {
    role: "assistant",
    content: [
      {
        type: "reasoning",
        text: "The user wants the current weather in Tokyo. I should call the weather tool first.",
      },
      {
        type: "tool-call",
        toolCallId: "tool-1",
        toolName: "get_weather",
        args: { city: "Tokyo" },
        argsText: '{ "city": "Tokyo" }',
        result: { temp: "22C", condition: "Partly cloudy" },
      },
      {
        type: "reasoning",
        text: "Got the weather result. I can now answer the user directly.",
      },
      {
        type: "text",
        text: "It's currently 22C and partly cloudy in Tokyo.",
      },
    ],
    status: { type: "complete", reason: "stop" },
  },
];

function ReasoningBlock({ text }: { text: string }) {
  return (
    <div className="flex gap-3 px-4 py-2">
      <div className="bg-muted flex size-5 shrink-0 items-center justify-center rounded-full">
        <BrainIcon className="text-muted-foreground size-3" />
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed italic">
        {text}
      </p>
    </div>
  );
}

function ToolCallBlock({
  toolName,
  argsText,
  result,
}: {
  toolName: string;
  argsText: string;
  result?: unknown;
}) {
  return (
    <div className="flex gap-3 px-4 py-2">
      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
        <CheckCircle2Icon className="size-3 text-emerald-600 dark:text-emerald-400" />
      </div>
      <Collapsible.Root className="min-w-0 flex-1">
        <Collapsible.Trigger className="group flex w-full items-center gap-1.5 text-start text-sm">
          <WrenchIcon className="text-muted-foreground size-3" />
          <span className="font-medium">{toolName}</span>
          <ChevronRightIcon className="text-muted-foreground ms-auto size-3.5 transition-transform duration-150 group-data-panel-open:rotate-90 rtl:rotate-180 rtl:group-data-panel-open:rotate-90" />
        </Collapsible.Trigger>
        <Collapsible.Panel>
          <div className="bg-muted/40 mt-2 overflow-hidden rounded-md border">
            <div className="px-3 py-2">
              <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
                Args
              </p>
              <pre className="font-mono text-xs leading-relaxed">
                {argsText}
              </pre>
            </div>
            {result !== undefined && (
              <div className="border-t px-3 py-2">
                <p className="text-muted-foreground mb-1 text-[10px] font-medium tracking-wider uppercase">
                  Result
                </p>
                <pre className="font-mono text-xs leading-relaxed">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </Collapsible.Panel>
      </Collapsible.Root>
    </div>
  );
}

function AssistantChainOfThought({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-border/80 bg-background/90 overflow-hidden rounded-xl border shadow-sm">
      <button
        type="button"
        className="hover:bg-muted/50 flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <ChevronDownIcon className="size-4 shrink-0" />
        ) : (
          <ChevronRightIcon className="size-4 shrink-0" />
        )}
        Thinking
      </button>
      {open && <div className="border-t pb-3">{children}</div>}
    </div>
  );
}

function AssistantMessageText() {
  return (
    <div className="bg-muted max-w-[80%] rounded-2xl px-4 py-2.5 text-sm">
      <p>
        <MessagePartPrimitive.Text />
      </p>
    </div>
  );
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-end">
      <div className="bg-primary text-primary-foreground max-w-[80%] rounded-2xl px-4 py-2.5 text-sm">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex justify-start gap-3">
      <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium">
        AI
      </div>
      <div className="min-w-0 flex-1">
        <div className="space-y-2">
          <MessagePrimitive.GroupedParts
            groupBy={groupPartByType({
              reasoning: ["group-chainOfThought", "group-reasoning"],
              "tool-call": ["group-chainOfThought", "group-tool"],
              "standalone-tool-call": [],
            })}
          >
            {({ part, children }) => {
              switch (part.type) {
                case "group-chainOfThought":
                  return (
                    <AssistantChainOfThought>
                      {children}
                    </AssistantChainOfThought>
                  );
                case "group-reasoning":
                case "group-tool":
                  return <>{children}</>;
                case "text":
                  return <AssistantMessageText />;
                case "reasoning":
                  return <ReasoningBlock text={part.text} />;
                case "tool-call":
                  return (
                    <ToolCallBlock
                      toolName={part.toolName}
                      argsText={part.argsText}
                      result={part.result}
                    />
                  );
                default:
                  return null;
              }
            }}
          </MessagePrimitive.GroupedParts>
        </div>
      </div>
    </MessagePrimitive.Root>
  );
}

export function ChainOfThoughtPrimitiveSample() {
  return (
    <div className="not-prose border-border/50 bg-muted/40 flex items-center rounded-xl border p-8">
      <div className="mx-auto w-full max-w-lg">
        <SampleRuntimeProvider messages={sampleMessages}>
          <ThreadPrimitive.Messages
            components={{ UserMessage, AssistantMessage }}
          />
        </SampleRuntimeProvider>
      </div>
    </div>
  );
}
