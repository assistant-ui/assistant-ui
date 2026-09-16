import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, XIcon } from "lucide-react-native";
import type { FC } from "react";
import { Animated, Text, View, type ViewProps } from "react-native";
import { IconButton } from "./icon-button";
import { field, mono, monoStyle, paper, usePulse } from "./surfaces";

export interface QueuedMessage {
  id: string;
  text: string;
}

export type MessageQueueProps = Omit<ViewProps, "children"> & {
  running: string;
  queued: readonly QueuedMessage[];
  onCancel?: (id: string) => void;
};

export const MessageQueue: FC<MessageQueueProps> = ({
  running,
  queued,
  onCancel,
  className,
  ...props
}) => {
  const opacity = usePulse(true, 0.35);

  return (
    <View
      className={cn("aui-message-queue w-full max-w-sm gap-2", className)}
      {...props}
    >
      <View
        className={cn(paper, "flex-row items-center gap-2.5 rounded-2xl p-3")}
      >
        <Animated.View style={{ opacity }}>
          <View className="size-2 shrink-0 rounded-full bg-blue-500 dark:bg-blue-400" />
        </Animated.View>
        <Text
          className="text-foreground/90 flex-1 text-[13.5px]"
          numberOfLines={1}
        >
          {running}
        </Text>
        <Text
          className={cn(mono, "text-foreground/35 shrink-0")}
          style={monoStyle}
        >
          running
        </Text>
      </View>

      {queued.length > 0 && (
        <View className="flex-row items-baseline justify-between px-1">
          <Text className={cn(mono, "text-foreground/35")} style={monoStyle}>
            {queued.length} queued
          </Text>
          <Text className={cn(mono, "text-foreground/35")} style={monoStyle}>
            sends when this finishes
          </Text>
        </View>
      )}

      <View className="gap-1.5" accessibilityRole="list">
        {queued.map((message, index) => (
          <View
            key={message.id}
            className={cn(
              field,
              "flex-row items-center gap-2.5 rounded-2xl py-2 pr-2 pl-3",
            )}
          >
            <Text
              className={cn(
                mono,
                "text-foreground/30 w-3 shrink-0 tabular-nums",
              )}
              style={monoStyle}
            >
              {index + 1}
            </Text>
            <Text
              className="text-foreground/60 flex-1 text-[13.5px]"
              numberOfLines={1}
            >
              {message.text}
            </Text>
            <Icon
              as={ArrowUpIcon}
              className="text-foreground/25 size-3 shrink-0"
            />
            {onCancel && (
              <IconButton
                onPress={() => onCancel(message.id)}
                label={`Remove "${message.text}" from the queue`}
                className="shrink-0"
              >
                <Icon as={XIcon} className="text-foreground/70 size-3.5" />
              </IconButton>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};
