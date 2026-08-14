<script lang="ts">
  import {
    composerCancel,
    composerInput,
    composerSend,
    threadMessages,
    useAui,
    useAuiState,
  } from "@assistant-ui/svelte";
  import { ArrowUpIcon, PlusIcon, SquareIcon } from "@lucide/svelte";
  import Message from "./Message.svelte";

  const aui = useAui();
  const messages = threadMessages();
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const suggestions = useAuiState((s) => s.suggestions.suggestions);
  const input = composerInput();
  const send = composerSend();
  const cancel = composerCancel();

  let viewport = $state<HTMLElement>();

  $effect(() => {
    void messages.items.length;
    void isRunning.current;
    viewport?.scrollTo({ top: viewport.scrollHeight });
  });

  const sendSuggestion = (prompt: string) => {
    aui.composer.setText(prompt);
    aui.composer.send();
  };
</script>

<div class="bg-background flex h-full flex-col">
  <header
    class="border-border/60 flex items-center justify-between border-b px-4 py-2"
  >
    <span class="text-sm font-medium">assistant-ui × Svelte</span>
    <button
      class="border-border/60 hover:bg-muted flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors"
      onclick={() => aui.threads.switchToNewThread()}
    >
      <PlusIcon class="size-4" /> New chat
    </button>
  </header>
  <div
    bind:this={viewport}
    class="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
  >
    <div class="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pt-12">
      {#if messages.items.length === 0}
        <div class="flex flex-1 flex-col items-center justify-center gap-6 pb-24">
          <h1 class="text-2xl font-semibold">How can I help you today?</h1>
          <div class="flex flex-wrap items-center justify-center gap-2 px-4">
            {#each suggestions.current as suggestion (suggestion.prompt)}
              <button
                class="text-foreground hover:bg-muted border-border/60 flex h-auto flex-col items-start gap-0.5 rounded-2xl border px-3.5 py-2 text-sm transition-colors"
                onclick={() => sendSuggestion(suggestion.prompt)}
              >
                <span class="font-medium">{suggestion.title}</span>
                <span class="text-muted-foreground text-xs">
                  {suggestion.label}
                </span>
              </button>
            {/each}
          </div>
        </div>
      {/if}
      <ol class="mb-4 flex flex-col gap-y-6 empty:hidden">
        {#each messages.items as message, index}
          <Message {message} item={messages.item(index)} />
        {/each}
        {#if isRunning.current}
          <li class="text-foreground px-2 leading-relaxed">
            <span class="animate-pulse">…</span>
          </li>
        {/if}
      </ol>
    </div>
  </div>
  <div class="mx-auto w-full max-w-2xl px-4 pb-4">
    <div
      class="border-border/60 focus-within:border-border flex w-full flex-col gap-2 rounded-2xl border p-2.5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] focus-within:shadow-[0_6px_24px_-8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.05)]"
    >
      <textarea
        {...input.props}
        class="caret-primary placeholder:text-muted-foreground/80 max-h-32 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base outline-none"
        placeholder="Send a message..."
        name="message"
        rows="1"
      ></textarea>
      <div class="flex items-center justify-end">
        {#if !isRunning.current}
          <button
            {...send.props}
            class="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full transition-opacity disabled:opacity-50"
            aria-label="Send"
          >
            <ArrowUpIcon class="size-4.5" />
          </button>
        {:else}
          <button
            {...cancel.props}
            class="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-full"
            aria-label="Stop"
          >
            <SquareIcon class="size-3.5 fill-current" />
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>
