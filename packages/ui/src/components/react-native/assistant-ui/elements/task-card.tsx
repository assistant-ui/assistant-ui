import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  BanIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  XIcon,
} from "lucide-react-native";
import { Children, type FC, type ReactNode, useState } from "react";
import { Animated, Pressable, Text, View, type ViewProps } from "react-native";
import {
  mono,
  monoStyle,
  paper,
  textButtonHitSlop,
  usePulse,
} from "./surfaces";

export type TaskCardState =
  | "working"
  | "waiting"
  | "done"
  | "failed"
  | "cancelled";

const isRenderable = (node: ReactNode) =>
  node !== undefined && node !== null && node !== false && node !== true;

export const TaskStateIcon: FC<{
  state: TaskCardState;
  className?: string;
}> = ({ state, className }) => {
  const opacity = usePulse(state === "working", 0.35);
  if (state === "done") {
    return (
      <Icon
        as={CheckIcon}
        className={cn("size-3.5 text-emerald-500", className)}
      />
    );
  }
  if (state === "failed") {
    return (
      <Icon as={XIcon} className={cn("text-destructive size-3.5", className)} />
    );
  }
  if (state === "cancelled") {
    return (
      <Icon
        as={BanIcon}
        className={cn("text-foreground/35 size-3.5", className)}
      />
    );
  }
  return (
    <Animated.View style={{ opacity }}>
      <View
        className={cn(
          "m-1 size-1.5 rounded-full",
          state === "working"
            ? "bg-blue-500 dark:bg-blue-400"
            : "border-foreground/35 border",
          className,
        )}
      />
    </Animated.View>
  );
};

export type TaskCardProps = Omit<ViewProps, "children"> & {
  label: string;
  meta?: string | undefined;
  state: TaskCardState;
  elapsed?: string | undefined;
  actions?: ReactNode | undefined;
  result?: ReactNode | undefined;
  open?: boolean | undefined;
  onOpenChange?: ((open: boolean) => void) | undefined;
  children?: ReactNode | undefined;
};

export const TaskCard: FC<TaskCardProps> = ({
  label,
  meta,
  state,
  elapsed,
  actions,
  result,
  open,
  onOpenChange,
  children,
  className,
  ...props
}) => {
  const hasTranscript = Children.toArray(children).length > 0;
  const inert = open !== undefined && onOpenChange === undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const toggle = () => {
    const next = !isOpen;
    if (open === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <View
      className={cn(
        "aui-task-card w-full max-w-sm overflow-hidden rounded-2xl",
        paper,
        className,
      )}
      {...props}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${state}`}
        aria-expanded={hasTranscript ? isOpen : undefined}
        disabled={!hasTranscript || inert}
        hitSlop={textButtonHitSlop}
        onPress={toggle}
        className="aui-task-card-header active:bg-foreground/5 flex-row items-center gap-2.5 px-3.5 py-2.5"
      >
        <TaskStateIcon state={state} />
        <Text
          className="aui-task-card-label text-foreground min-w-0 flex-1 text-[13.5px]"
          numberOfLines={1}
        >
          {label}
        </Text>
        {meta !== undefined && (
          <Text
            className={cn(mono, "text-foreground/35 max-w-24 shrink-0")}
            style={monoStyle}
            numberOfLines={1}
          >
            {meta}
          </Text>
        )}
        {elapsed !== undefined && (
          <Text
            className={cn(mono, "text-foreground/30 shrink-0 tabular-nums")}
            style={monoStyle}
          >
            {elapsed}
          </Text>
        )}
        {hasTranscript && (
          <Icon
            as={isOpen ? ChevronDownIcon : ChevronRightIcon}
            className="text-foreground/25 size-3"
          />
        )}
      </Pressable>
      {isRenderable(actions) && (
        <View className="aui-task-card-actions border-border/60 border-t px-3.5 py-2.5">
          {actions}
        </View>
      )}
      {hasTranscript && isOpen && (
        <View className="aui-task-card-transcript border-border/60 gap-2 border-t px-3.5 py-2.5">
          {children}
        </View>
      )}
      {isRenderable(result) && (
        <View className="aui-task-card-result border-border/60 border-t px-3.5 py-2">
          {result}
        </View>
      )}
    </View>
  );
};
