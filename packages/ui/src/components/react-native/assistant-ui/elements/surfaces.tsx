import { cn } from "@/lib/utils";
import { type FC, useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Text,
  type TextProps,
  type TextStyle,
} from "react-native";

export const paper = "bg-background border border-border/60 dark:bg-card";

export const field = "bg-foreground/5 dark:bg-foreground/10";

export const inkButton = "bg-foreground active:opacity-90";

export const mono = "text-[11px] tracking-tight";

export const monoStyle: TextStyle = {
  fontFamily: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }),
};

export const useMotion = () => {
  const [motion, setMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (mounted) setMotion(!reduced);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (reduced) => setMotion(!reduced),
    );
    return () => {
      mounted = false;
      // react-native-web returns nothing when the environment has no matchMedia.
      subscription?.remove();
    };
  }, []);

  return motion;
};

export const usePulse = (active: boolean, low = 0.45) => {
  const [opacity] = useState(() => new Animated.Value(1));
  const motion = useMotion();

  useEffect(() => {
    if (!active || !motion) {
      opacity.setValue(1);
      return;
    }
    const useNativeDriver = Platform.OS !== "web";
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: low,
          duration: 700,
          useNativeDriver,
          isInteraction: false,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver,
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, low, motion, opacity]);

  return opacity;
};

export const ShimmerLabel: FC<TextProps & { active?: boolean }> = ({
  active = true,
  className,
  ...props
}) => {
  const opacity = usePulse(active);

  return (
    <Animated.View style={{ opacity }}>
      <Text className={cn("aui-shimmer-label", className)} {...props} />
    </Animated.View>
  );
};
