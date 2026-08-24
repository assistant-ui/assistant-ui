<script lang="ts">
  import { useAuiState, type PartItem } from "@assistant-ui/svelte";

  let { item }: { item: PartItem } = $props();

  // The part handle is index-bound and referentially stable for this
  // position's lifetime under unkeyed iteration, so a one-time capture is
  // correct.
  // svelte-ignore state_referenced_locally
  const target = { item };

  const name = useAuiState(
    (s) => (s.part.type === "tool-call" ? s.part.toolName : null),
    target,
  );
  const argsText = useAuiState(
    (s) => (s.part.type === "tool-call" ? s.part.argsText : ""),
    target,
  );
  const result = useAuiState(
    (s) => (s.part.type === "tool-call" ? s.part.result : undefined),
    target,
  );
  const running = useAuiState(
    (s) => s.part.status.type === "running",
    target,
  );
</script>

{#if name.current !== null}
  <div
    class="border-border/60 my-1 rounded-lg border px-3 py-2 font-mono text-xs"
  >
    <span class="font-semibold">{name.current}</span>({argsText.current})
    {#if running.current}
      <span class="animate-pulse">…</span>
    {:else if result.current !== undefined}
      <pre class="text-muted-foreground mt-1 whitespace-pre-wrap">{JSON.stringify(
          result.current,
        )}</pre>
    {/if}
  </div>
{/if}
