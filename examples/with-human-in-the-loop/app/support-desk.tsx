"use client";

import {
  AssistantRuntimeProvider,
  AuiConfig,
  Suggestions,
  Tools,
  type AssistantRuntime,
} from "@assistant-ui/react";
import {
  Thread,
  type ThreadComponents,
} from "@/components/assistant-ui/elements/thread.aui";
import { AUTO_REFUND_LIMIT, formatMoney } from "../lib/orders";
import toolkit from "./toolkit";

const config = AuiConfig({
  tools: Tools({ toolkit }),
  suggestions: Suggestions([
    {
      title: "Order 1042",
      label: "the customer is sending part of it back",
      prompt:
        "The customer on order 1042 is sending part of it back. Refund those items.",
    },
    {
      title: "Order 1063",
      label: "the desk frame arrived bent",
      prompt: "The desk frame on order 1063 arrived bent. Refund it.",
    },
    {
      title: "Order 1057",
      label: "the keyboard never arrived",
      prompt: "The keyboard on order 1057 never arrived. Refund it.",
    },
  ]),
});

function Welcome() {
  return (
    <div className="fade-in slide-in-from-bottom-1 animate-in fill-mode-both mb-6 flex flex-col gap-2 px-2 duration-200">
      <h1 className="text-2xl font-medium tracking-tight">
        Which order is this about?
      </h1>
      <p className="text-muted-foreground text-sm">
        Refunds over {formatMoney(AUTO_REFUND_LIMIT)} wait for your approval.
        The sample orders are 1042, 1057, and 1063.
      </p>
    </div>
  );
}

const THREAD_COMPONENTS: ThreadComponents = { Welcome };

/**
 * The support desk UI and its toolkit. The tool UIs read the tool call they
 * render and nothing else, so the same component runs on any runtime.
 */
export function SupportDesk({
  runtime,
  model,
}: {
  runtime: AssistantRuntime;
  model: string;
}) {
  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <div className="flex h-full flex-col">
        <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b px-4">
          <p className="shrink-0 text-sm font-medium">Support desk</p>
          <p className="text-muted-foreground min-w-0 truncate text-xs">
            {model}
          </p>
        </header>
        <main className="min-h-0 flex-1">
          <Thread components={THREAD_COMPONENTS} />
        </main>
      </div>
    </AssistantRuntimeProvider>
  );
}
