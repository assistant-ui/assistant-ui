<script lang="ts">
  import type { MessageState } from "@assistant-ui/core/store";
  import {
    actionBarCopy,
    actionBarEdit,
    actionBarReload,
    branchPickerNext,
    branchPickerPrevious,
    composerCancel,
    composerInput,
    composerSend,
    messageParts,
    useAuiState,
    type MessageItem,
  } from "@assistant-ui/svelte";
  import {
    CheckIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CopyIcon,
    PencilIcon,
    RefreshCwIcon,
  } from "@lucide/svelte";
  import ToolPart from "./ToolPart.svelte";

  let { message, item }: { message: MessageState; item: MessageItem } =
    $props();

  // The item handle is index-bound and referentially stable for this
  // position's lifetime under unkeyed iteration, so a one-time capture is
  // correct.
  // svelte-ignore state_referenced_locally
  const target = { item };

  const parts = messageParts(target);
  const isEditing = useAuiState((s) => s.composer.isEditing, target);
  const branchNumber = useAuiState((s) => s.message.branchNumber, target);
  const branchCount = useAuiState((s) => s.message.branchCount, target);
  const pulsing = useAuiState(
    (s) => s.message.content.length === 0 && s.thread.isRunning,
    target,
  );
  const error = useAuiState((s) => {
    const current = s.message;
    if (
      current.role !== "assistant" ||
      current.status.type !== "incomplete" ||
      current.status.reason !== "error"
    ) {
      return null;
    }
    const value = current.status.error;
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && "message" in value) {
      return String(value.message);
    }
    return "An error occurred.";
  }, target);
  const edit = actionBarEdit(target);
  const copy = actionBarCopy(target);
  const reload = actionBarReload(target);
  const previous = branchPickerPrevious(target);
  const next = branchPickerNext(target);
  const editInput = composerInput(target);
  const editSend = composerSend(target);
  const editCancel = composerCancel(target);
</script>

<li
  data-role={message.role}
  class={[
    "group flex flex-col gap-1",
    message.role === "user" ? "items-end" : "items-start",
  ].join(" ")}
>
  {#if isEditing.current}
    <div
      class="border-border/60 flex w-full max-w-[80%] flex-col gap-2 rounded-xl border p-2"
    >
      <textarea
        {...editInput.props}
        class="w-full resize-none bg-transparent px-1 py-0.5 outline-none"
        aria-label="Edit message"
        rows="2"
      ></textarea>
      <div class="flex justify-end gap-2 text-sm">
        <button
          {...editCancel.props}
          class="text-muted-foreground rounded-lg px-2 py-1"
        >
          Discard
        </button>
        <button
          {...editSend.props}
          class="bg-primary text-primary-foreground rounded-lg px-2 py-1 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  {:else}
    <div
      class={[
        "px-2 wrap-break-word",
        message.role === "user"
          ? "bg-muted text-foreground max-w-[80%] rounded-xl px-4 py-2"
          : "text-foreground leading-relaxed",
      ].join(" ")}
    >
      {#each parts.items as part, index}
        {#if part.type === "text"}
          <p class="whitespace-pre-line">
            {part.text}{#if pulsing.current && index === parts.items.length - 1}<span
                class="animate-pulse">…</span
              >{/if}
          </p>
        {:else if part.type === "reasoning"}
          <details class="text-muted-foreground my-1 text-sm">
            <summary class="cursor-pointer select-none">Reasoning</summary>
            <p class="whitespace-pre-line border-border/60 mt-1 border-l-2 pl-3">
              {part.text}
            </p>
          </details>
        {:else if part.type === "tool-call"}
          <ToolPart item={parts.item(index)} />
        {:else}
          <p class="text-muted-foreground text-xs">[{part.type}]</p>
        {/if}
      {/each}
      {#if pulsing.current && parts.items.at(-1)?.type !== "text"}<span
          class="animate-pulse">…</span
        >{/if}
      {#if error.current}<span class="text-destructive text-sm"
        >{error.current}</span
      >{/if}
    </div>
  {/if}
  <div
    class="text-muted-foreground flex items-center gap-1 px-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100"
  >
    {#if message.role === "user"}
      <button
        {...edit.props}
        class="hover:text-foreground rounded p-1"
        aria-label="Edit"
      >
        <PencilIcon class="size-3.5" />
      </button>
    {/if}
    <button
      {...copy.props}
      class="hover:text-foreground rounded p-1"
      aria-label="Copy"
    >
      {#if copy.isCopied}
        <CheckIcon class="size-3.5" />
      {:else}
        <CopyIcon class="size-3.5" />
      {/if}
    </button>
    {#if message.role === "assistant"}
      <button
        {...reload.props}
        class="hover:text-foreground rounded p-1"
        aria-label="Regenerate"
      >
        <RefreshCwIcon class="size-3.5" />
      </button>
    {/if}
    {#if branchCount.current > 1}
      <span class="flex items-center gap-0.5 text-xs">
        <button
          {...previous.props}
          class="hover:text-foreground rounded p-0.5 disabled:opacity-40"
          aria-label="Previous branch"
        >
          <ChevronLeftIcon class="size-3.5" />
        </button>
        {branchNumber.current} / {branchCount.current}
        <button
          {...next.props}
          class="hover:text-foreground rounded p-0.5 disabled:opacity-40"
          aria-label="Next branch"
        >
          <ChevronRightIcon class="size-3.5" />
        </button>
      </span>
    {/if}
  </div>
</li>
