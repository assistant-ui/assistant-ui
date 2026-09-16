import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  BrainIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "lucide-react-native";
import {
  createContext,
  type FC,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  ScrollView,
  type ScrollViewProps,
  Text,
  View,
  type ViewProps,
} from "react-native";
import { ShimmerLabel, textButtonHitSlop } from "./surfaces";

type ReasoningContextValue = {
  isOpen: boolean;
  isPreview: boolean;
  onOpenChange: (open: boolean) => void;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

const useReasoningContext = () => {
  const context = useContext(ReasoningContext);
  if (!context)
    throw new Error("Reasoning components must be nested in ReasoningRoot");
  return context;
};

export type ReasoningRootProps = Omit<ViewProps, "children"> &
  PropsWithChildren<{
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
    streaming?: boolean;
  }>;

export const ReasoningRoot: FC<ReasoningRootProps> = ({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  streaming,
  className,
  children,
  ...props
}) => {
  const [initialOpen] = useState(defaultOpen);
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled
    ? controlledOpen
    : (userOpen ?? (streaming || initialOpen));
  const isPreview = streaming === true && isOpen;
  const onOpenChange = useCallback(
    (open: boolean) => {
      if (!isControlled) setUserOpen(open);
      controlledOnOpenChange?.(open);
    },
    [controlledOnOpenChange, isControlled],
  );

  return (
    <ReasoningContext.Provider value={{ isOpen, isPreview, onOpenChange }}>
      <View className={cn("aui-reasoning-root w-full", className)} {...props}>
        {children}
      </View>
    </ReasoningContext.Provider>
  );
};

export type ReasoningTriggerProps = Omit<
  React.ComponentProps<typeof Pressable>,
  "children"
> & {
  active?: boolean;
  duration?: number;
};

export const ReasoningTrigger: FC<ReasoningTriggerProps> = ({
  active,
  duration,
  className,
  onPress,
  ...props
}) => {
  const { isOpen, onOpenChange } = useReasoningContext();
  const label = `Reasoning${duration ? ` (${duration}s)` : ""}`;

  return (
    <Pressable
      className={cn(
        "aui-reasoning-trigger flex-row items-center gap-2 py-1.5",
        className,
      )}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: isOpen }}
      hitSlop={textButtonHitSlop}
      onPress={(event) => {
        onPress?.(event);
        onOpenChange(!isOpen);
      }}
      {...props}
    >
      <Icon as={BrainIcon} className="text-muted-foreground size-4" />
      <ShimmerLabel
        active={active}
        className="text-muted-foreground text-sm tabular-nums"
      >
        {label}
      </ShimmerLabel>
      <Icon
        as={isOpen ? ChevronDownIcon : ChevronRightIcon}
        className="text-muted-foreground size-4"
      />
    </Pressable>
  );
};

export type ReasoningContentProps = Omit<ViewProps, "children"> &
  PropsWithChildren;

export const ReasoningContent: FC<ReasoningContentProps> = ({
  className,
  children,
  ...props
}) => {
  const { isOpen } = useReasoningContext();
  if (!isOpen) return null;

  return (
    <View
      className={cn("aui-reasoning-content overflow-hidden", className)}
      {...props}
    >
      {children}
    </View>
  );
};

export type ReasoningTextProps = Omit<ScrollViewProps, "children"> &
  PropsWithChildren;

export const ReasoningText: FC<ReasoningTextProps> = ({
  className,
  contentContainerClassName,
  children,
  onContentSizeChange,
  onScrollBeginDrag,
  onScroll,
  ...props
}) => {
  const { isPreview } = useReasoningContext();
  const scrollRef = useRef<ScrollView>(null);
  const pinnedRef = useRef(true);
  const lastScrollYRef = useRef(0);
  const lastContentHeightRef = useRef(0);

  useEffect(() => {
    if (!isPreview) return;
    pinnedRef.current = true;
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [isPreview]);

  return (
    <ScrollView
      ref={scrollRef}
      className={cn("aui-reasoning-text max-h-64", className)}
      contentContainerClassName={cn(
        "aui-reasoning-text-content gap-4 py-2 ps-6",
        contentContainerClassName,
      )}
      nestedScrollEnabled
      scrollEventThrottle={16}
      onContentSizeChange={(width, height) => {
        onContentSizeChange?.(width, height);
        if (isPreview && pinnedRef.current) {
          scrollRef.current?.scrollToEnd({ animated: false });
        }
      }}
      onScrollBeginDrag={(event) => {
        pinnedRef.current = false;
        onScrollBeginDrag?.(event);
      }}
      onScroll={(event) => {
        const { contentOffset, contentSize, layoutMeasurement } =
          event.nativeEvent;
        const isAtBottom =
          Math.abs(
            contentSize.height - contentOffset.y - layoutMeasurement.height,
          ) <= 1 || contentSize.height <= layoutMeasurement.height;

        if (isAtBottom) {
          pinnedRef.current = true;
        } else if (
          contentOffset.y < lastScrollYRef.current &&
          contentSize.height === lastContentHeightRef.current
        ) {
          pinnedRef.current = false;
        }

        lastScrollYRef.current = contentOffset.y;
        lastContentHeightRef.current = contentSize.height;
        onScroll?.(event);
      }}
      {...props}
    >
      <View>
        {typeof children === "string" || typeof children === "number" ? (
          <Text className="text-muted-foreground text-sm">{children}</Text>
        ) : (
          children
        )}
      </View>
    </ScrollView>
  );
};
