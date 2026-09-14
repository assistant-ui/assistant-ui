import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { ChevronRightIcon, type LucideIcon } from "lucide-react-native";
import type { FC } from "react";
import { Pressable, Text, View } from "react-native";
import { take } from "../utils/range";
import { mono, monoStyle, ShimmerLabel } from "./surfaces";

export interface TimelineStep {
  verb: string;
  chip: string;
  icon: LucideIcon;
}

export interface TimelineStat {
  file: string;
  added?: number;
  removed?: number;
}

export interface ToolTimelineProps {
  steps: readonly TimelineStep[];
  visibleSteps: number;
  streaming: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restingLabel: string;
  activeLabel: string;
  stats: TimelineStat[];
  className?: string;
}

const chipClassName = "bg-foreground/5 rounded-md px-1.5 py-0.5";

export const ToolTimeline: FC<ToolTimelineProps> = ({
  steps,
  visibleSteps,
  streaming,
  open,
  onOpenChange,
  restingLabel,
  activeLabel,
  stats,
  className,
}) => {
  const shown = take(steps, visibleSteps);

  return (
    <View className={cn("aui-tool-timeline w-full max-w-sm", className)}>
      <Pressable
        onPress={() => onOpenChange(!open)}
        accessibilityRole="button"
        aria-expanded={open}
        accessibilityLabel={streaming ? activeLabel : restingLabel}
        className="flex-row items-center gap-1.5 rounded-md py-1"
      >
        <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
          <Icon as={ChevronRightIcon} className="text-foreground/55 size-3.5" />
        </View>
        {streaming ? (
          <ShimmerLabel className="text-foreground/55 text-[13.5px] tabular-nums">
            {activeLabel}
          </ShimmerLabel>
        ) : (
          <Text className="text-foreground/55 text-[13.5px] tabular-nums">
            {restingLabel}
          </Text>
        )}
      </Pressable>
      {open && (
        <View className="gap-2.5 ps-4 pt-2.5">
          {shown.map((step, index) => {
            const active = streaming && index === shown.length - 1;

            return (
              <View key={step.chip} className="flex-row items-center gap-2">
                <Icon as={step.icon} className="text-foreground/35 size-3.5" />
                <ShimmerLabel
                  active={active}
                  className="text-foreground/55 text-[13.5px]"
                >
                  {step.verb}
                </ShimmerLabel>
                <View className={chipClassName}>
                  <Text
                    className={cn(mono, "text-foreground/70")}
                    style={monoStyle}
                  >
                    {step.chip}
                  </Text>
                </View>
              </View>
            );
          })}
          {stats.length > 0 && (
            <View className="flex-row flex-wrap gap-1.5 pt-1">
              {stats.map((stat) => (
                <View
                  key={stat.file}
                  className={cn(chipClassName, "flex-row items-center gap-1")}
                >
                  <Text
                    className={cn(mono, "text-foreground/70")}
                    style={monoStyle}
                  >
                    {stat.file}
                  </Text>
                  {stat.added !== undefined && (
                    <Text
                      className={cn(
                        mono,
                        "text-emerald-600 dark:text-emerald-400",
                      )}
                      style={monoStyle}
                    >
                      +{stat.added}
                    </Text>
                  )}
                  {stat.removed !== undefined && (
                    <Text
                      className={cn(mono, "text-red-600 dark:text-red-400")}
                      style={monoStyle}
                    >
                      −{stat.removed}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};
