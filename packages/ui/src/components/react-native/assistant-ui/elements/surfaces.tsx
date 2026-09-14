import { cn } from "@/lib/utils";
import { type FC, useEffect, useState, useSyncExternalStore } from "react";
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

export const textButtonHitSlop = { top: 12, bottom: 12 };

export const monoStyle: TextStyle = {
  fontFamily: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }),
};

let reduceMotion: boolean | undefined;
let reduceMotionQuery = 0;
let reduceMotionSubscription: { remove(): void } | undefined;
const motionListeners = new Set<() => void>();

const setReduceMotion = (reduced: boolean) => {
  reduceMotion = reduced;
  for (const listener of motionListeners) listener();
};

const subscribeMotion = (listener: () => void) => {
  if (motionListeners.size === 0) {
    const query = ++reduceMotionQuery;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (query === reduceMotionQuery) setReduceMotion(reduced);
    });
    reduceMotionSubscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
  }
  motionListeners.add(listener);
  return () => {
    motionListeners.delete(listener);
    if (motionListeners.size === 0) {
      reduceMotionQuery++;
      // react-native-web returns nothing when the environment has no matchMedia.
      reduceMotionSubscription?.remove();
      reduceMotionSubscription = undefined;
      reduceMotion = undefined;
    }
  };
};

const getMotion = () => reduceMotion === false;

export const useMotion = () =>
  useSyncExternalStore(subscribeMotion, getMotion, getMotion);

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
