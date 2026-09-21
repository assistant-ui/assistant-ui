import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react-native";
import { WrenchIcon } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { inkButton, textButtonHitSlop } from "./surfaces";

const ghostButtonClassName =
  "active:bg-foreground/5 h-8 justify-center rounded-full px-3.5";

export const ToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  status,
  approval,
  respondToApproval,
}) => {
  const [submitted, setSubmitted] = useState(false);
  const pendingApproval =
    approval != null &&
    approval.approved === undefined &&
    approval.resolution === undefined;
  const waiting = pendingApproval || status.type === "requires-action";
  const title =
    status.type === "running" && !pendingApproval
      ? `Running ${toolName}…`
      : waiting
        ? `Waiting for ${toolName}`
        : `Used ${toolName}`;
  const showActions = pendingApproval && respondToApproval != null;

  const respond = (approved: boolean) => {
    if (submitted || !respondToApproval) return;
    setSubmitted(true);
    void Promise.resolve(respondToApproval({ approved })).catch(() => {
      setSubmitted(false);
    });
  };

  return (
    <View className="aui-tool-fallback-root border-border bg-card my-1 gap-2 rounded-xl border px-3 py-2">
      <View className="flex-row items-center gap-2">
        <Icon as={WrenchIcon} className="text-muted-foreground size-4" />
        <Text className="aui-tool-fallback-title text-muted-foreground text-sm">
          {title}
        </Text>
      </View>
      {showActions ? (
        <View className="flex-row items-center justify-end gap-2">
          <Pressable
            onPress={() => respond(false)}
            disabled={submitted}
            accessibilityRole="button"
            accessibilityLabel="Deny"
            hitSlop={textButtonHitSlop}
            className={ghostButtonClassName}
          >
            <Text className="text-foreground/55 text-xs font-medium">Deny</Text>
          </Pressable>
          <Pressable
            onPress={() => respond(true)}
            disabled={submitted}
            accessibilityRole="button"
            accessibilityLabel="Allow"
            hitSlop={textButtonHitSlop}
            className={cn(inkButton, "h-8 justify-center rounded-full px-3.5")}
          >
            <Text className="text-background text-xs font-medium">Allow</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
};
