<script setup lang="ts">
import {
  ThreadListItemPrimitiveArchive,
  ThreadListItemPrimitiveDelete,
  ThreadListItemPrimitiveRoot,
  ThreadListItemPrimitiveTitle,
  ThreadListItemPrimitiveTrigger,
  ThreadListPrimitiveItems,
  ThreadListPrimitiveNew,
  ThreadListPrimitiveRoot,
} from "@assistant-ui/vue";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuTrigger,
} from "reka-ui";
import {
  ArchiveIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TrashIcon,
} from "@lucide/vue";
</script>

<template>
  <ThreadListPrimitiveRoot
    data-slot="aui_thread-list-root"
    class="flex flex-col gap-0.5"
  >
    <ThreadListPrimitiveNew
      data-slot="aui_thread-list-new"
      class="hover:bg-muted data-active:bg-muted flex h-8 justify-start gap-2 rounded-md px-2.5 text-sm font-normal"
    >
      <PlusIcon data-slot="aui_thread-list-new-icon" class="size-4 shrink-0" />
      <span data-slot="aui_thread-list-new-label" class="whitespace-nowrap">
        New Thread
      </span>
    </ThreadListPrimitiveNew>
    <div data-slot="aui_thread-list-items" class="flex flex-col gap-0.5">
      <ThreadListPrimitiveItems>
        <ThreadListItemPrimitiveRoot
          data-slot="aui_thread-list-item"
          class="group hover:bg-muted focus-visible:bg-muted data-active:bg-muted has-focus-visible:bg-muted has-data-[state=open]:bg-muted relative flex h-8 items-center rounded-md transition-colors focus-visible:outline-none"
        >
          <ThreadListItemPrimitiveTrigger
            data-slot="aui_thread-list-item-trigger"
            class="focus-visible:ring-ring/50 flex h-full min-w-0 flex-1 items-center rounded-md px-2.5 text-start text-sm outline-none group-hover:pe-9 group-has-focus-visible:pe-9 group-has-data-[state=open]:pe-9 group-data-active:pe-9 focus-visible:ring-1"
          >
            <span
              data-slot="aui_thread-list-item-title"
              class="min-w-0 flex-1 truncate"
            >
              <ThreadListItemPrimitiveTitle fallback="New Chat" />
            </span>
          </ThreadListItemPrimitiveTrigger>
          <DropdownMenuRoot>
            <DropdownMenuTrigger
              data-slot="aui_thread-list-item-more"
              class="data-[state=open]:bg-accent focus-visible:ring-ring/50 absolute end-1.5 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md p-0 opacity-0 outline-none group-hover:opacity-100 group-has-focus-visible:opacity-100 group-data-active:opacity-100 focus-visible:ring-1 data-[state=open]:opacity-100"
              aria-label="More options"
            >
              <MoreHorizontalIcon class="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
              <DropdownMenuContent
                side="right"
                align="start"
                :side-offset="6"
                data-slot="aui_thread-list-item-more-content"
                class="bg-popover text-popover-foreground data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-32 overflow-hidden rounded-xl border p-1.5"
              >
                <DropdownMenuItem as-child>
                  <ThreadListItemPrimitiveArchive
                    data-slot="aui_thread-list-item-more-item"
                    class="hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none"
                  >
                    <ArchiveIcon class="size-4" />
                    Archive
                  </ThreadListItemPrimitiveArchive>
                </DropdownMenuItem>
                <DropdownMenuItem as-child>
                  <ThreadListItemPrimitiveDelete
                    data-slot="aui_thread-list-item-more-item"
                    class="text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none"
                  >
                    <TrashIcon class="size-4" />
                    Delete
                  </ThreadListItemPrimitiveDelete>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenuPortal>
          </DropdownMenuRoot>
        </ThreadListItemPrimitiveRoot>
      </ThreadListPrimitiveItems>
    </div>
  </ThreadListPrimitiveRoot>
</template>
