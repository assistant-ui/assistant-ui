import { cn } from "@/lib/utils";
import { type FC, useEffect, useState } from "react";
import { Animated, Platform, View, type ViewProps } from "react-native";
import { paper } from "./surfaces";

const DOT_DELAYS = [0, 160, 320];

const TypingDot: FC<{ delay: number }> = ({ delay }) => {
  const [opacity] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const useNativeDriver = Platform.OS !== "web";
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, delay]);

  return (
    <Animated.View style={{ opacity }}>
      <View className="bg-foreground/40 size-1.5 rounded-full" />
    </Animated.View>
  );
};

export type TypingIndicatorProps = Omit<ViewProps, "children"> & {
  variant?: "bubble" | "bare";
};

export const TypingIndicator: FC<TypingIndicatorProps> = ({
  variant = "bubble",
  className,
  ...props
}) => {
  const dots = DOT_DELAYS.map((delay) => (
    <TypingDot key={delay} delay={delay} />
  ));

  if (variant === "bare") {
    return (
      <View
        className={cn(
          "aui-typing-indicator flex-row items-center gap-1",
          className,
        )}
        accessible
        accessibilityLabel="Assistant is typing"
        {...props}
      >
        {dots}
      </View>
    );
  }

  return (
    <View
      className={cn(
        "aui-typing-indicator self-start rounded-full px-4 py-3.5",
        paper,
        className,
      )}
      {...props}
    >
      <View
        className="flex-row items-center gap-1"
        accessible
        accessibilityLabel="Assistant is typing"
      >
        {dots}
      </View>
    </View>
  );
};
