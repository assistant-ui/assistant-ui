import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  CheckIcon,
  PauseIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react-native";
import type { FC, ReactNode } from "react";
import { Animated, Text, View, type ViewProps } from "react-native";
import {
  mono,
  monoStyle,
  paper,
  useAnnounce,
  usePulse,
  webLiveRegion,
} from "./surfaces";

export type AgentState = "working" | "waiting" | "done" | "failed";

export type AgentStatusProps = Omit<ViewProps, "children"> & {
  state: AgentState;
  label: string;
  elapsed?: string | undefined;
  trailing?: ReactNode | undefined;
};

const StateDot: FC<{ state: AgentState }> = ({ state }) => {
  const opacity = usePulse(state === "working", 0.35);

  if (state === "done") {
    return <Icon as={CheckIcon} className="size-3 text-emerald-500" />;
  }
  if (state === "failed") {
    return <Icon as={XIcon} className="text-destructive size-3" />;
  }

  return (
    <Animated.View style={{ opacity }}>
      <View
        className={cn(
          "size-1.5 rounded-full",
          state === "working"
            ? "bg-blue-500 dark:bg-blue-400"
            : "border-foreground/35 border",
        )}
      />
    </Animated.View>
  );
};

export const AgentStatus: FC<AgentStatusProps> = ({
  state,
  label,
  elapsed,
  trailing,
  className,
  accessibilityLabel: customLabel,
  ...props
}) => {
  const settled = state === "done" || state === "failed";
  const accessibilityLabel = customLabel ?? `${label}, ${state}`;
  useAnnounce(accessibilityLabel, { onMount: false });

  return (
    <View
      className={cn(
        "aui-agent-status flex-row items-center gap-2.5 self-start rounded-full py-1.5 ps-3.5 pe-1.5",
        paper,
        className,
      )}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion={webLiveRegion}
      {...props}
    >
      <StateDot state={state} />
      <Text className="text-foreground max-w-44 text-xs" numberOfLines={1}>
        {label}
      </Text>
      {elapsed !== undefined && !settled && (
        <Text
          className={cn(mono, "text-foreground/30 tabular-nums")}
          style={monoStyle}
        >
          {elapsed}
        </Text>
      )}
      <View className="size-6 items-center justify-center rounded-full">
        {trailing !== undefined ? (
          trailing
        ) : (
          <Icon
            as={settled ? RotateCcwIcon : PauseIcon}
            className="text-foreground/45 size-3"
          />
        )}
      </View>
    </View>
  );
};
