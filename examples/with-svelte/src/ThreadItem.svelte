<script lang="ts">
  import {
    threadListItemTrigger,
    useAuiState,
    type ThreadListItem,
  } from "@assistant-ui/svelte";

  let { item }: { item: ThreadListItem } = $props();

  // The item handle is index-bound and referentially stable for this
  // position's lifetime under unkeyed iteration, so a one-time capture is
  // correct.
  // svelte-ignore state_referenced_locally
  const target = { item };

  const trigger = threadListItemTrigger(target);
  const title = useAuiState((s) => s.threadListItem.title, target);
</script>

<button
  {...trigger.props}
  class="hover:bg-muted text-muted-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors"
>
  {title.current || "New Chat"}
</button>
