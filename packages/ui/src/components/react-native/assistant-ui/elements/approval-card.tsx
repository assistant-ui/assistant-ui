import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { CheckIcon, TerminalIcon, XIcon } from "lucide-react-native";
import type { FC } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type ViewProps,
} from "react-native";
import {
  field,
  inkButton,
  monoStyle,
  paper,
  textButtonHitSlop,
  useAnnounce,
  webLiveRegion,
} from "./surfaces";

export type ApprovalState = "request" | "running" | "done" | "denied";

export type ApprovalCardProps = Omit<ViewProps, "children"> & {
  state: ApprovalState;
  command: string;
  title: string;
  subtitle: string;
  onAllowOnce?: () => void;
  onAlwaysAllow?: () => void;
  onDeny?: () => void;
};

const ghostButtonClassName =
  "active:bg-foreground/5 h-8 justify-center rounded-full px-3.5";

const statusText: Record<Exclude<ApprovalState, "request">, string> = {
  running: "Approved, running",
  denied: "Denied",
  done: "Finished with exit 0",
};

export const ApprovalCard: FC<ApprovalCardProps> = ({
  state,
  command,
  title,
  subtitle,
  onAllowOnce,
  onAlwaysAllow,
  onDeny,
  className,
  ...props
}) => {
  useAnnounce(state === "request" ? undefined : statusText[state], {
    onMount: false,
  });

  return (
    <View
      className={cn(
        "aui-approval-card w-full max-w-sm gap-3.5 rounded-[20px] p-4",
        paper,
        className,
      )}
      {...props}
    >
      <View className="flex-row items-center gap-3">
        <View className="bg-foreground/5 size-9 items-center justify-center rounded-xl">
          <Icon as={TerminalIcon} className="text-foreground/45 size-4" />
        </View>
        <View className="flex-1">
          <Text className="text-foreground text-[13.5px] font-medium">
            {title}
          </Text>
          <Text className="text-foreground/45 text-xs">{subtitle}</Text>
        </View>
      </View>

      <View className={cn(field, "rounded-xl px-3.5 py-2.5")}>
        <Text
          className="text-foreground/70 text-xs"
          style={monoStyle}
          selectable
        >
          {command}
        </Text>
      </View>

      <View className="h-8 flex-row items-center justify-end gap-2">
        {state === "request" ? (
          <>
            <Pressable
              onPress={onDeny}
              accessibilityRole="button"
              accessibilityLabel="Deny"
              hitSlop={textButtonHitSlop}
              className={ghostButtonClassName}
            >
              <Text className="text-foreground/55 text-xs font-medium">
                Deny
              </Text>
            </Pressable>
            <Pressable
              onPress={onAlwaysAllow}
              accessibilityRole="button"
              accessibilityLabel="Always allow"
              hitSlop={textButtonHitSlop}
              className={ghostButtonClassName}
            >
              <Text className="text-foreground/55 text-xs font-medium">
                Always allow
              </Text>
            </Pressable>
            <Pressable
              onPress={onAllowOnce}
              accessibilityRole="button"
              accessibilityLabel="Allow once"
              hitSlop={textButtonHitSlop}
              className={cn(
                inkButton,
                "h-8 justify-center rounded-full px-3.5",
              )}
            >
              <Text className="text-background text-xs font-medium">
                Allow once
              </Text>
            </Pressable>
          </>
        ) : (
          <View
            className="flex-row items-center gap-2"
            accessible
            accessibilityLiveRegion={webLiveRegion}
          >
            {state === "running" ? (
              <ActivityIndicator size="small" />
            ) : state === "denied" ? (
              <Icon as={XIcon} className="text-foreground/45 size-3.5" />
            ) : (
              <Icon as={CheckIcon} className="size-3.5 text-emerald-500" />
            )}
            <Text className="text-foreground/55 text-xs">
              {statusText[state]}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
