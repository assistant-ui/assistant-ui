import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, SquareIcon } from "lucide-react-native";
import type { FC } from "react";
import { Pressable, Text, View, type ViewProps } from "react-native";
import { field, mono, monoStyle } from "./surfaces";

export type StoppedRunProps = Omit<ViewProps, "children"> & {
  words: readonly string[];
  reason: string;
  onContinue?: () => void;
  onDiscard?: () => void;
};

export const StoppedRun: FC<StoppedRunProps> = ({
  words,
  reason,
  onContinue,
  onDiscard,
  className,
  ...props
}) => (
  <View
    className={cn("aui-stopped-run w-full max-w-sm gap-3", className)}
    {...props}
  >
    <Text className="text-foreground/80 text-[13.5px] leading-relaxed">
      {words.join(" ")}
      <View
        accessibilityElementsHidden
        className="bg-foreground/20 ms-1 h-3.5 w-0.5 rounded-full"
      />
    </Text>

    <View className="flex-row items-center gap-2">
      <View
        className={cn(
          field,
          mono,
          "flex-row items-center gap-1.5 rounded-full px-2.5 py-1",
        )}
      >
        <Icon as={SquareIcon} className="text-foreground/45 size-2.5" />
        <Text className={cn(mono, "text-foreground/45")} style={monoStyle}>
          {reason}
        </Text>
      </View>

      <Pressable
        onPress={onContinue}
        accessibilityRole="button"
        accessibilityLabel="Continue"
        className="active:bg-foreground/5 ms-auto h-7 flex-row items-center gap-1 rounded-full px-2.5"
      >
        <Text className="text-foreground/70 text-xs font-medium">Continue</Text>
        <Icon as={ArrowRightIcon} className="text-foreground/70 size-3" />
      </Pressable>
      <Pressable
        onPress={onDiscard}
        accessibilityRole="button"
        accessibilityLabel="Discard"
        className="active:bg-foreground/5 h-7 justify-center rounded-full px-2.5"
      >
        <Text className="text-foreground/45 text-xs font-medium">Discard</Text>
      </Pressable>
    </View>
  </View>
);
