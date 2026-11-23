import {
  ThreadListItemPrimitiveRoot,
  ThreadListItemPrimitiveTitle,
  ThreadListItemPrimitiveTrigger,
} from "@assistant-ui/solid";

export default function ThreadItem() {
  return (
    <ThreadListItemPrimitiveRoot class="min-w-0">
      <ThreadListItemPrimitiveTrigger class="hover:bg-muted text-muted-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground w-full truncate rounded-lg px-3 py-2 text-left text-sm transition-colors">
        <ThreadListItemPrimitiveTitle fallback="New Chat" />
      </ThreadListItemPrimitiveTrigger>
    </ThreadListItemPrimitiveRoot>
  );
}
