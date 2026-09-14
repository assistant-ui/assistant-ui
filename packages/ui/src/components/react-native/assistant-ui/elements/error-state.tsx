import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { CircleAlertIcon, RefreshCwIcon } from "lucide-react-native";
import type { FC } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type ViewProps,
} from "react-native";
import { ShimmerLabel, textButtonHitSlop } from "./surfaces";

export interface ErrorStateProps extends Omit<ViewProps, "children"> {
  title: string;
  detail: string;
  retrying: boolean;
  onRetry: () => void;
}

export const ErrorState: FC<ErrorStateProps> = ({
  title,
  detail,
  retrying,
  onRetry,
  className,
  ...props
}) => {
  if (retrying) {
    return (
      <View
        className={cn(
          "aui-error-state w-full max-w-sm flex-row items-center gap-2.5",
          className,
        )}
        accessible
        accessibilityLabel="Retrying"
        accessibilityLiveRegion="polite"
        {...props}
      >
        <ActivityIndicator size="small" />
        <ShimmerLabel className="text-foreground/55 text-sm">
          Retrying
        </ShimmerLabel>
      </View>
    );
  }

  return (
    <View
      className={cn(
        "aui-error-state w-full max-w-sm flex-row items-start gap-2.5 rounded-2xl bg-red-500/5 px-4 py-3 dark:bg-red-500/10",
        className,
      )}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      {...props}
    >
      <Icon as={CircleAlertIcon} className="mt-0.5 size-4 text-red-500/80" />
      <View className="flex-1">
        <Text className="text-sm font-medium text-red-600 dark:text-red-400">
          {title}
        </Text>
        <Text className="mt-0.5 text-[13px] leading-snug text-red-600/60 dark:text-red-400/60">
          {detail}
        </Text>
      </View>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry"
        hitSlop={textButtonHitSlop}
        className="flex-row items-center gap-1.5 rounded-full px-3 py-1 active:bg-red-500/10"
      >
        <Icon
          as={RefreshCwIcon}
          className="size-3 text-red-600 dark:text-red-400"
        />
        <Text className="text-xs font-medium text-red-600 dark:text-red-400">
          Retry
        </Text>
      </Pressable>
    </View>
  );
};
