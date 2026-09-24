import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAuiState,
} from "@assistant-ui/react-native";
import { SquarePenIcon } from "lucide-react-native";
import type { FC } from "react";
import { Text } from "react-native";

export const ThreadList: FC = () => (
  <ThreadListPrimitive.Root className="aui-thread-list-root flex-1">
    <ThreadListNew />
    <Text className="aui-thread-list-heading text-muted-foreground px-5 pt-3 pb-1.5 text-xs font-medium">
      Recent
    </Text>
    <ThreadListPrimitive.Items
      renderItem={() => <ThreadListItem />}
      className="aui-thread-list-items flex-1"
      contentContainerClassName="pb-2"
      showsVerticalScrollIndicator={false}
    />
  </ThreadListPrimitive.Root>
);

const ThreadListNew: FC = () => {
  const isActive = useAuiState(
    (s) => s.threads.newThreadId === s.threads.mainThreadId,
  );

  return (
    <ThreadListPrimitive.New
      className={cn(
        "aui-thread-list-new active:bg-muted mx-2 mb-1 h-10 flex-row items-center gap-2.5 rounded-lg px-3",
        isActive && "bg-muted",
      )}
    >
      <Icon as={SquarePenIcon} className="text-foreground size-[18px]" />
      <Text className="text-foreground text-[15px] font-medium">New chat</Text>
    </ThreadListPrimitive.New>
  );
};

const ThreadListItem: FC = () => {
  const isActive = useAuiState(
    (s) => s.threads.mainThreadId === s.threadListItem.id,
  );

  return (
    <ThreadListItemPrimitive.Root>
      <ThreadListItemPrimitive.Trigger
        className={cn(
          "aui-thread-list-item active:bg-muted mx-2 h-[38px] justify-center rounded-lg px-3",
          isActive && "bg-muted",
        )}
      >
        <Text
          numberOfLines={1}
          className={cn(
            "aui-thread-list-item-title text-foreground text-[15px]",
            isActive && "font-semibold",
          )}
        >
          <ThreadListItemPrimitive.Title fallback="New chat" />
        </Text>
      </ThreadListItemPrimitive.Trigger>
    </ThreadListItemPrimitive.Root>
  );
};
