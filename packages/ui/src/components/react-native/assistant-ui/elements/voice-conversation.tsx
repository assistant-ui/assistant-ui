import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { MicIcon, MicOffIcon, PhoneOffIcon } from "lucide-react-native";
import type { FC } from "react";
import { Animated, Pressable, Text, View, type ViewProps } from "react-native";
import { clamp } from "../utils/range";
import { mono, monoStyle, paper, usePulse } from "./surfaces";

export type VoiceMode = "connecting" | "listening" | "thinking" | "speaking";

export interface VoiceTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const CAPTION: Record<VoiceMode, string> = {
  connecting: "Connecting",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
};

const HINT: Record<VoiceMode, string> = {
  connecting: "Opening the mic",
  listening: "Listening for you",
  thinking: "Working on it",
  speaking: "Playing the reply",
};

export type VoiceConversationProps = Omit<ViewProps, "children"> & {
  mode: VoiceMode;
  amplitude: number;
  transcript: readonly VoiceTurn[];
  muted?: boolean;
  onToggleMute?: () => void;
  onInterrupt?: () => void;
  onEnd?: () => void;
};

export const VoiceConversation: FC<VoiceConversationProps> = ({
  mode,
  amplitude,
  transcript,
  muted = false,
  onToggleMute,
  onInterrupt,
  onEnd,
  className,
  ...props
}) => {
  const level = clamp(amplitude, 0, 1);
  const active = mode === "listening" || mode === "speaking";
  const canInterrupt = mode === "speaking" && onInterrupt !== undefined;
  const centerOpacity = usePulse(!active, 0.35);

  return (
    <View
      className={cn(
        "aui-voice-conversation",
        paper,
        "w-full max-w-xs items-center gap-4 rounded-[28px] px-5 py-5",
        className,
      )}
      {...props}
    >
      <Pressable
        onPress={onInterrupt}
        disabled={!canInterrupt}
        accessibilityRole="button"
        accessibilityLabel="Interrupt the assistant"
        className="size-24 items-center justify-center rounded-full"
      >
        <View
          pointerEvents="none"
          className={cn(
            "absolute rounded-full",
            mode === "speaking"
              ? "bg-blue-500/12 dark:bg-blue-400/15"
              : "bg-foreground/5",
          )}
          style={{
            width: 96,
            height: 96,
            transform: [{ scale: active ? 0.72 + level * 0.28 : 0.62 }],
            opacity: active ? 1 : 0.5,
          }}
        />
        <View
          pointerEvents="none"
          className={cn(
            "absolute rounded-full",
            mode === "speaking"
              ? "bg-blue-500/20 dark:bg-blue-400/25"
              : "bg-foreground/8",
          )}
          style={{
            width: 68,
            height: 68,
            transform: [{ scale: active ? 0.8 + level * 0.22 : 0.7 }],
          }}
        />
        <Animated.View style={{ opacity: centerOpacity }}>
          <View
            pointerEvents="none"
            className={cn(
              "size-10 rounded-full",
              mode === "connecting" && "bg-foreground/20",
              mode === "listening" && "bg-foreground/80",
              mode === "thinking" && "bg-foreground/30",
              mode === "speaking" && "bg-blue-500 dark:bg-blue-400",
            )}
            style={{
              transform: [{ scale: active ? 0.9 + level * 0.2 : 0.85 }],
            }}
          />
        </Animated.View>
      </Pressable>

      <View className="items-center gap-1">
        <Text className="text-foreground text-[13.5px] font-medium">
          {CAPTION[mode]}
        </Text>
        <Text className={cn(mono, "text-foreground/35")} style={monoStyle}>
          {muted ? "Mic off" : canInterrupt ? "Tap to interrupt" : HINT[mode]}
        </Text>
      </View>

      <View className="min-h-18 w-full gap-1.5">
        {transcript.map((turn) => (
          <View key={turn.id} className="flex-row gap-2">
            <Text
              className={cn(
                mono,
                "w-8 shrink-0",
                turn.role === "user"
                  ? "text-foreground/30"
                  : "text-blue-500/70 dark:text-blue-400/70",
              )}
              style={monoStyle}
            >
              {turn.role === "user" ? "you" : "ai"}
            </Text>
            <Text
              selectable
              className={cn(
                "min-w-0 flex-1 text-xs leading-relaxed",
                turn.role === "user"
                  ? "text-foreground/50"
                  : "text-foreground/80",
              )}
            >
              {turn.text}
            </Text>
          </View>
        ))}
      </View>

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onToggleMute}
          disabled={onToggleMute === undefined}
          accessibilityRole="togglebutton"
          accessibilityLabel={
            muted ? "Turn the microphone on" : "Turn the microphone off"
          }
          aria-checked={muted}
          className={cn(
            "active:bg-foreground/5 size-10 items-center justify-center rounded-full disabled:opacity-30",
            muted && "bg-foreground/8",
          )}
        >
          <Icon
            as={muted ? MicOffIcon : MicIcon}
            className="text-foreground/70 size-4"
          />
        </Pressable>
        <Pressable
          onPress={onEnd}
          disabled={onEnd === undefined}
          accessibilityRole="button"
          accessibilityLabel="End the call"
          className="size-10 items-center justify-center rounded-full bg-red-500/90 active:opacity-90 disabled:opacity-30"
        >
          <Icon as={PhoneOffIcon} className="size-4 text-white" />
        </Pressable>
      </View>
    </View>
  );
};
