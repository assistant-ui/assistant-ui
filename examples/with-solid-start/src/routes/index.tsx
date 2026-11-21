import { Show } from "solid-js";
import {
  AuiConfig,
  AuiProvider,
  ComposerPrimitiveCancel,
  ComposerPrimitiveInput,
  ComposerPrimitiveSend,
  ThreadListPrimitiveItems,
  ThreadListPrimitiveNew,
  ThreadListPrimitiveRoot,
  ThreadPrimitiveMessages,
  ThreadPrimitiveRoot,
  ThreadPrimitiveScrollToBottom,
  ThreadPrimitiveViewport,
  ThreadPrimitiveViewportFooter,
  useAuiState,
} from "@assistant-ui/solid";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import Message from "../Message";
import ThreadItem from "../ThreadItem";
import { createEchoRuntime } from "../runtime";

export default function Home() {
  const config = AuiConfig({
    threads: RuntimeAdapter(
      createEchoRuntime([
        { id: "initial-user", role: "user", text: "Hello, SolidStart!" },
        {
          id: "initial-assistant",
          role: "assistant",
          text: "Echo: Hello, SolidStart!",
        },
      ]),
    ),
  });

  return (
    <AuiProvider config={config}>
      <Chat />
    </AuiProvider>
  );
}

function Chat() {
  const isEmpty = useAuiState((s) => s.thread.messages.length === 0);
  const isRunning = useAuiState((s) => s.thread.isRunning);

  return (
    <div class="bg-background flex h-dvh min-h-0 flex-col sm:flex-row">
      <aside
        class="border-border/60 flex max-h-40 shrink-0 flex-col border-b p-3 sm:max-h-none sm:w-64 sm:border-r sm:border-b-0"
        aria-label="Chat history"
      >
        <ThreadListPrimitiveRoot class="flex min-h-0 flex-1 flex-col gap-2">
          <ThreadListPrimitiveNew class="border-border/60 hover:bg-muted flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors">
            <svg
              class="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New chat
          </ThreadListPrimitiveNew>
          <div class="flex min-h-0 flex-col gap-1 overflow-y-auto">
            <ThreadListPrimitiveItems>
              <ThreadItem />
            </ThreadListPrimitiveItems>
          </div>
        </ThreadListPrimitiveRoot>
      </aside>
      <ThreadPrimitiveRoot
        class="flex min-h-0 min-w-0 flex-1 flex-col"
        role="main"
        aria-label="Chat"
      >
        <ThreadPrimitiveViewport class="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto scroll-smooth motion-reduce:scroll-auto">
          <div class="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-12">
            <Show when={isEmpty()}>
              <div class="flex flex-1 flex-col items-center justify-center gap-6 pb-24">
                <h1 class="text-center text-2xl font-semibold">
                  How can I help you today?
                </h1>
              </div>
            </Show>
            <ol
              class="mb-4 flex flex-col gap-y-6 empty:hidden"
              aria-label="Messages"
            >
              <ThreadPrimitiveMessages>
                <Message />
              </ThreadPrimitiveMessages>
              <Show when={isRunning()}>
                <li
                  class="text-foreground px-2 leading-relaxed"
                  aria-hidden="true"
                >
                  <span class="animate-pulse motion-reduce:animate-none">
                    …
                  </span>
                </li>
              </Show>
            </ol>
            <p role="status" class="sr-only">
              {isRunning() ? "Generating response" : ""}
            </p>
          </div>
          <ThreadPrimitiveViewportFooter class="bg-background sticky bottom-0 mx-auto flex w-full max-w-2xl shrink-0 flex-col gap-2 px-4 pt-2 pb-4">
            <ThreadPrimitiveScrollToBottom
              class="border-border/60 bg-background z-10 mx-auto rounded-full border p-2 shadow-sm transition-[opacity,visibility] disabled:invisible disabled:opacity-0"
              aria-label="Scroll to bottom"
            >
              <svg
                class="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m5 12 7 7 7-7M12 5v14" />
              </svg>
            </ThreadPrimitiveScrollToBottom>
            <div class="border-border/60 focus-within:border-border flex w-full flex-col gap-2 rounded-2xl border p-2.5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] focus-within:shadow-[0_6px_24px_-8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.05)]">
              <ComposerPrimitiveInput
                class="caret-primary placeholder:text-muted-foreground/80 max-h-32 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base outline-none"
                placeholder="Send a message..."
                aria-label="Message"
                name="message"
                rows={1}
              />
              <div class="flex items-center justify-end">
                <Show
                  when={!isRunning()}
                  fallback={
                    <ComposerPrimitiveCancel
                      class="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full"
                      aria-label="Stop"
                    >
                      <svg
                        class="size-3.5 fill-current"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <rect x="5" y="5" width="14" height="14" rx="2" />
                      </svg>
                    </ComposerPrimitiveCancel>
                  }
                >
                  <ComposerPrimitiveSend
                    class="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full transition-opacity disabled:opacity-50"
                    aria-label="Send"
                  >
                    <svg
                      class="size-4.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m5 12 7-7 7 7M12 19V5" />
                    </svg>
                  </ComposerPrimitiveSend>
                </Show>
              </div>
            </div>
          </ThreadPrimitiveViewportFooter>
        </ThreadPrimitiveViewport>
      </ThreadPrimitiveRoot>
    </div>
  );
}
