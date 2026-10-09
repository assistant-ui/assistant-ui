<script lang="ts">
  import type { Suggestion } from "@assistant-ui/core/store";
  import { suggestionTrigger } from "@assistant-ui/svelte";

  let { suggestion, index }: { suggestion: Suggestion; index: number } =
    $props();

  // The index is position-bound under unkeyed iteration, so a one-time
  // capture is correct.
  // svelte-ignore state_referenced_locally
  const trigger = suggestionTrigger({ index, send: true });
</script>

<button
  {...trigger.props}
  class="text-foreground hover:bg-muted border-border/60 flex h-auto flex-col items-start gap-0.5 rounded-2xl border px-3.5 py-2 text-sm transition-colors"
>
  <span class="font-medium">{suggestion.title}</span>
  <span class="text-muted-foreground text-xs">{suggestion.label}</span>
</button>
