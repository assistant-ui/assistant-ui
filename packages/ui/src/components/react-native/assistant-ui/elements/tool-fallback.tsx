import { Icon } from "@/components/ui/icon";
import type { ToolCallMessagePartComponent } from "@assistant-ui/react-native";
import { WrenchIcon } from "lucide-react-native";
import { Text, View } from "react-native";

export const ToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  status,
}) => (
  <View className="aui-tool-fallback-root border-border bg-card my-1 flex-row items-center gap-2 rounded-xl border px-3 py-2">
    <Icon as={WrenchIcon} className="text-muted-foreground size-4" />
    <Text className="aui-tool-fallback-title text-muted-foreground text-sm">
      {status.type === "running" ? `Running ${toolName}…` : `Used ${toolName}`}
    </Text>
  </View>
);
