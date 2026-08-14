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

  let { message, item }: { message: MessageState; item: MessageItem } =
    $props();

  const text = $derived(
    message.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join(""),
  );

  const isEditing = useAuiState((s) => s.composer.isEditing, { item });
  const branchNumber = useAuiState((s) => s.message.branchNumber, { item });
  const branchCount = useAuiState((s) => s.message.branchCount, { item });
  const edit = actionBarEdit({ item });
  const copy = actionBarCopy({ item });
  const reload = actionBarReload({ item });
  const previous = branchPickerPrevious({ item });
  const next = branchPickerNext({ item });
  const editInput = composerInput({ item });
  const editSend = composerSend({ item });
  const editCancel = composerCancel({ item });
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
      <p class="whitespace-pre-line">{text}</p>
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
