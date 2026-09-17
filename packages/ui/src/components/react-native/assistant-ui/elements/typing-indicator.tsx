import { cn } from "@/lib/utils";
import { type FC, useEffect, useState } from "react";
import { Animated, Platform, View, type ViewProps } from "react-native";
import { paper, useAnnounce, useMotion, webLiveRegion } from "./surfaces";

const DOT_DELAYS = [0, 160, 320];

const TypingDot: FC<{ delay: number; animated: boolean }> = ({
  delay,
  animated,
}) => {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!animated) {
      opacity.setValue(1);
      return;
    }
    const useNativeDriver = Platform.OS !== "web";
    const animation = Animated.sequence([
      Animated.timing(opacity, {
        toValue: 0.3,
        duration: 0,
        delay,
        useNativeDriver,
        isInteraction: false,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver,
            isInteraction: false,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver,
            isInteraction: false,
          }),
        ]),
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, [animated, delay, opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <View className="bg-foreground/40 size-1.5 rounded-full" />
    </Animated.View>
  );
};

export type TypingIndicatorProps = Omit<ViewProps, "children"> & {
  variant?: "bubble" | "bare";
  /** Announces the label when the indicator appears; pass false when the screen already announces the state. */
  announce?: boolean;
};

export const TypingIndicator: FC<TypingIndicatorProps> = ({
  variant = "bubble",
  announce = true,
  className,
  accessibilityLabel = "Assistant is typing",
  ...props
}) => {
  const motion = useMotion();
  useAnnounce(announce ? accessibilityLabel : undefined);
  const dots = DOT_DELAYS.map((delay) => (
    <TypingDot key={delay} delay={delay} animated={motion} />
  ));

  return (
    <View
      className={cn(
        "aui-typing-indicator",
        variant === "bare"
          ? "flex-row items-center gap-1"
          : cn("self-start rounded-full px-4 py-3.5", paper),
        className,
      )}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion={webLiveRegion}
      {...props}
    >
      {variant === "bare" ? (
        dots
      ) : (
        <View className="flex-row items-center gap-1">{dots}</View>
      )}
    </View>
  );
};
