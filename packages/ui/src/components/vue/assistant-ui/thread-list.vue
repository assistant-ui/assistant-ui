<script setup lang="ts">
import { computed, ref } from "vue";
import {
  AuiIf,
  ThreadListItemByIndexProvider,
  ThreadListItemPrimitiveArchive,
  ThreadListItemPrimitiveDelete,
  ThreadListItemPrimitiveRoot,
  ThreadListItemPrimitiveTitle,
  ThreadListItemPrimitiveTrigger,
  ThreadListPrimitiveNew,
  ThreadListPrimitiveRoot,
  useAuiState,
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
  SearchIcon,
  TrashIcon,
} from "@lucide/vue";

const DAY_IN_MS = 86_400_000;

const dateGroupLabel = (date: Date | undefined, startOfToday: number) => {
  if (!date || date.getTime() >= startOfToday) return "Today";
  if (date.getTime() >= startOfToday - DAY_IN_MS) return "Yesterday";
  return "Earlier";
};

const search = ref("");
const hasThreads = useAuiState((s) => s.threads.threadIds.length > 0);
const threadIds = useAuiState((s) => s.threads.threadIds);
const threadItems = useAuiState((s) => s.threads.threadItems);
const query = computed(() =>
  (hasThreads.value ? search.value : "").trim().toLowerCase(),
);

const threadListGroups = computed(() => {
  const itemsById = new Map(threadItems.value.map((item) => [item.id, item]));
  const dates = threadIds.value.map((id) => itemsById.get(id)?.lastMessageAt);
  const filteredIndices = threadIds.value
    .map((id, index) => ({ id, index }))
    .filter(
      ({ id }) =>
        !query.value ||
        (itemsById.get(id)?.title || "New Chat")
          .toLowerCase()
          .includes(query.value),
    )
    .map(({ index }) => index);

  if (!filteredIndices.some((index) => dates[index])) {
    return { filteredIndices, groups: null };
  }

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const time = (index: number) =>
    dates[index]?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const sorted = [...filteredIndices].sort((a, b) => time(b) - time(a));
  const groups: { label: string; indices: number[] }[] = [];

  for (const index of sorted) {
    const label = dateGroupLabel(dates[index], startOfToday);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup?.label === label) {
      lastGroup.indices.push(index);
    } else {
      groups.push({ label, indices: [index] });
    }
  }

  return { filteredIndices, groups };
});

const visibleThreadGroups = computed(
  () =>
    threadListGroups.value.groups ?? [
      { label: undefined, indices: threadListGroups.value.filteredIndices },
    ],
);
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
    <div
      v-if="hasThreads"
      data-slot="aui_thread-list-search"
      class="relative px-0.5 py-1"
    >
      <SearchIcon
        data-slot="aui_thread-list-search-icon"
        class="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2"
      />
      <input
        v-model="search"
        type="search"
        aria-label="Search threads"
        placeholder="Search threads"
        class="placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 bg-muted/60 focus-visible:bg-background h-8 w-full min-w-0 rounded-lg border border-transparent px-3 py-1 ps-8 text-sm transition-colors outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-1"
      />
    </div>
    <div data-slot="aui_thread-list-items" class="flex flex-col gap-0.5">
      <AuiIf :condition="(s) => s.threads.isLoading">
        <div class="flex flex-col gap-0.5">
          <div
            v-for="index in 5"
            :key="index"
            role="status"
            aria-label="Loading threads"
            data-slot="aui_thread-list-skeleton-wrapper"
            class="flex h-8 items-center px-2.5"
          >
            <div
              data-slot="aui_thread-list-skeleton"
              class="bg-accent h-3.5 w-full animate-pulse rounded-md"
            />
          </div>
        </div>
      </AuiIf>
      <AuiIf :condition="(s) => !s.threads.isLoading">
        <div
          v-if="query && threadListGroups.filteredIndices.length === 0"
          data-slot="aui_thread-list-empty"
          class="text-muted-foreground px-2.5 py-4 text-sm"
        >
          No threads found
        </div>
        <template v-else>
          <template v-for="group in visibleThreadGroups" :key="group.label">
            <div
              v-if="group.label"
              data-slot="aui_thread-list-group-label"
              class="text-muted-foreground px-2.5 pt-3 pb-1 text-xs font-medium"
            >
              {{ group.label }}
            </div>
            <ThreadListItemByIndexProvider
              v-for="index in group.indices"
              :key="threadIds[index]"
              :index="index"
            >
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
            </ThreadListItemByIndexProvider>
          </template>
        </template>
      </AuiIf>
    </div>
  </ThreadListPrimitiveRoot>
</template>
