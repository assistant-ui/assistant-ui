import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/elements/attachment.aui";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  ActionBarPrimitive,
  AuiIf,
  type AssistantState,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  type TextMessagePartComponent,
  type ToolCallMessagePartComponent,
  useAuiState,
} from "@assistant-ui/react-native";
import * as Clipboard from "expo-clipboard";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  PencilIcon,
  RefreshCwIcon,
  WrenchIcon,
} from "lucide-react-native";
import { useEffect, useRef, type FC } from "react";
import {
  AccessibilityInfo,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Text,
  View,
  type ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const isNewChatView = (s: AssistantState) =>
  s.thread.messages.length === 0 &&
  (!s.thread.isLoading || s.threads.isLoading);

const isHistoryLoadingView = (s: AssistantState) =>
  s.thread.messages.length === 0 &&
  s.thread.isLoading &&
  !s.thread.isDisabled &&
  !s.threads.isLoading;

const iconButtonClassName =
  "aui-icon-button active:bg-muted size-7 items-center justify-center rounded-md";

const copyToClipboard = async (text: string) => {
  await Clipboard.setStringAsync(text);
};

export const Thread: FC = () => {
  const isEmpty = useAuiState(isNewChatView);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isRunning) {
      AccessibilityInfo.announceForAccessibility("Assistant is working");
    }
  }, [isRunning]);

  return (
    <ThreadPrimitive.Root className="aui-root aui-thread-root bg-background flex-1">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          className={cn(
            "aui-thread-viewport mx-auto w-full max-w-[44rem] flex-1",
            isEmpty && "justify-center",
          )}
        >
          <AuiIf condition={isNewChatView}>
            <ThreadWelcome />
          </AuiIf>
          <AuiIf condition={isHistoryLoadingView}>
            <ThreadHistorySkeleton />
          </AuiIf>
          <AuiIf condition={(s) => s.thread.messages.length > 0}>
            <ThreadPrimitive.MessagesFlatList
              className="aui-message-group flex-1"
              contentContainerClassName="gap-6 px-4 pt-4 pb-6"
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
            >
              {() => <ThreadMessage />}
            </ThreadPrimitive.MessagesFlatList>
          </AuiIf>
          <View
            className="aui-thread-viewport-footer gap-4 px-4"
            style={{ paddingBottom: insets.bottom + 8 }}
          >
            <Composer />
            <AuiIf condition={(s) => isNewChatView(s) && s.composer.isEmpty}>
              <ThreadSuggestions />
            </AuiIf>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC = () => {
  const role = useAuiState((s) => s.message.role);
  const isEditing = useAuiState((s) => s.message.composer.isEditing);

  if (isEditing) return <EditComposer />;
  if (role === "user") return <UserMessage />;
  return <AssistantMessage />;
};

const ThreadHistorySkeleton: FC = () => (
  <View
    className="aui-thread-history-skeleton gap-6 px-4 pt-4"
    accessible
    accessibilityRole="progressbar"
    accessibilityLabel="Loading conversation"
  >
    <View className="bg-muted ml-auto h-9 w-2/5 rounded-xl" />
    <View className="gap-2">
      <View className="bg-muted h-4 w-11/12 rounded" />
      <View className="bg-muted h-4 w-4/5 rounded" />
      <View className="bg-muted h-4 w-3/5 rounded" />
    </View>
    <View className="bg-muted ml-auto h-9 w-1/3 rounded-xl" />
    <View className="gap-2">
      <View className="bg-muted h-4 w-10/12 rounded" />
      <View className="bg-muted h-4 w-2/3 rounded" />
    </View>
  </View>
);

const ThreadWelcome: FC = () => (
  <View className="aui-thread-welcome-root mb-6 items-center px-4">
    <Text className="aui-thread-welcome-message text-foreground text-center text-2xl font-medium tracking-tight">
      How can I help you today?
    </Text>
  </View>
);

const ThreadSuggestions: FC = () => (
  <View className="aui-thread-welcome-suggestions w-full flex-row flex-wrap items-center justify-center gap-2">
    <ThreadPrimitive.Suggestions>
      {() => <ThreadSuggestionItem />}
    </ThreadPrimitive.Suggestions>
  </View>
);

const ThreadSuggestionItem: FC = () => (
  <SuggestionPrimitive.Trigger
    send
    className="aui-thread-welcome-suggestion border-border/60 active:bg-muted flex-row items-center gap-1.5 rounded-full border px-3.5 py-1.5"
  >
    <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1 text-foreground text-sm" />
    <AuiIf condition={(s) => !!s.suggestion.label}>
      <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 text-muted-foreground text-sm" />
    </AuiIf>
  </SuggestionPrimitive.Trigger>
);

const Composer: FC = () => (
  <ComposerPrimitive.Root className="aui-composer-root w-full">
    <View className="aui-composer-shell border-border/60 dark:border-muted-foreground/15 bg-card gap-2 rounded-3xl border p-2">
      <ComposerAttachments />
      <ComposerPrimitive.Input
        placeholder="Send a message..."
        placeholderTextColorClassName="accent-muted-foreground/60"
        className="aui-composer-input text-foreground web:resize-none web:outline-none max-h-48 min-h-10 px-2.5 py-1 text-base leading-6"
        multiline
        accessibilityLabel="Message input"
      />
      <ComposerAction />
    </View>
  </ComposerPrimitive.Root>
);

const ComposerAction: FC = () => (
  <View className="aui-composer-action-wrapper flex-row items-center justify-between">
    <ComposerAddAttachment />
    <View className="flex-row items-center gap-1.5">
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send
          className="aui-composer-send bg-primary active:bg-primary/90 size-7 items-center justify-center rounded-full disabled:opacity-50"
          accessibilityLabel="Send message"
        >
          <Icon
            as={ArrowUpIcon}
            className="aui-composer-send-icon text-primary-foreground size-4"
          />
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel
          className="aui-composer-cancel bg-primary active:bg-primary/90 size-7 items-center justify-center rounded-full"
          accessibilityLabel="Stop generating"
        >
          <View className="aui-composer-cancel-icon bg-primary-foreground size-3 rounded-[2px]" />
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </View>
  </View>
);

const MessageError: FC = () => (
  <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 dark:bg-destructive/5 mt-2 rounded-md border p-3">
    <ErrorPrimitive.Message
      className="aui-message-error-message text-destructive text-sm"
      numberOfLines={2}
    />
  </ErrorPrimitive.Root>
);

const UserText: TextMessagePartComponent = ({ text }) => (
  <Text
    className="aui-user-message-text text-foreground text-base leading-6"
    selectable
  >
    {text}
  </Text>
);

const AssistantText: TextMessagePartComponent = ({ text }) => (
  <Text
    className="aui-assistant-message-text text-foreground text-base leading-[26px]"
    selectable
  >
    {text}
  </Text>
);

const TypingDot: FC<{ delay: number }> = ({ delay }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

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
      <View className="bg-muted-foreground size-[7px] rounded-full" />
    </Animated.View>
  );
};

const AssistantIndicator: FC = () => {
  const isRunning = useAuiState((s) => s.message.status?.type === "running");
  if (!isRunning) return null;

  return (
    <View
      className="aui-assistant-message-indicator flex-row items-center gap-[5px] py-2"
      accessible
      accessibilityLabel="Assistant is working"
      accessibilityLiveRegion={Platform.OS === "web" ? "polite" : undefined}
    >
      <TypingDot delay={0} />
      <TypingDot delay={160} />
      <TypingDot delay={320} />
    </View>
  );
};

const ToolFallback: ToolCallMessagePartComponent = ({ toolName, status }) => (
  <View className="aui-tool-fallback-root border-border bg-card my-1 flex-row items-center gap-2 rounded-xl border px-3 py-2">
    <Icon as={WrenchIcon} className="text-muted-foreground size-4" />
    <Text className="aui-tool-fallback-title text-muted-foreground text-sm">
      {status.type === "running" ? `Running ${toolName}…` : `Used ${toolName}`}
    </Text>
  </View>
);

const AssistantMessage: FC = () => (
  <MessagePrimitive.Root className="aui-assistant-message-root">
    <View className="aui-assistant-message-content px-2">
      <MessagePrimitive.Parts
        components={{
          Text: AssistantText,
          Empty: AssistantIndicator,
          tools: { Fallback: ToolFallback },
        }}
      />
      <MessageError />
    </View>
    <View className="aui-assistant-message-footer ms-2 min-h-7.5 flex-row items-center pt-1.5">
      <BranchPicker />
      <AssistantActionBar />
    </View>
  </MessagePrimitive.Root>
);

const AssistantActionBar: FC = () => (
  <AuiIf
    condition={(s) =>
      !(s.message.role === "assistant" && s.message.status?.type === "running")
    }
  >
    <View className="aui-assistant-action-bar-root -ms-1 flex-row gap-1">
      <ActionBarPrimitive.Copy
        copyToClipboard={copyToClipboard}
        className={iconButtonClassName}
        accessibilityLabel="Copy"
      >
        {({ isCopied }) => (
          <Icon
            as={isCopied ? CheckIcon : CopyIcon}
            className="text-muted-foreground size-4"
          />
        )}
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload
        className={iconButtonClassName}
        accessibilityLabel="Refresh"
      >
        <Icon as={RefreshCwIcon} className="text-muted-foreground size-4" />
      </ActionBarPrimitive.Reload>
    </View>
  </AuiIf>
);

const UserMessage: FC = () => (
  <MessagePrimitive.Root className="aui-user-message-root items-end gap-y-2 px-2">
    <UserMessageAttachments />
    <View className="aui-user-message-content bg-muted max-w-[85%] rounded-xl px-4 py-2">
      <MessagePrimitive.Parts components={{ Text: UserText }} />
    </View>
    <View className="aui-user-message-footer -me-1 flex-row items-center justify-end">
      <BranchPicker />
      <UserActionBar />
    </View>
  </MessagePrimitive.Root>
);

const UserActionBar: FC = () => (
  <AuiIf condition={(s) => !s.thread.isRunning}>
    <ActionBarPrimitive.Edit
      className={cn(iconButtonClassName, "aui-user-action-edit")}
      accessibilityLabel="Edit"
    >
      <Icon as={PencilIcon} className="text-muted-foreground size-4" />
    </ActionBarPrimitive.Edit>
  </AuiIf>
);

const EditComposer: FC = () => (
  <MessagePrimitive.Root className="aui-edit-composer-wrapper px-2">
    <ComposerPrimitive.Root className="aui-edit-composer-root border-border/60 dark:border-muted-foreground/15 bg-card ms-auto w-full max-w-[85%] rounded-3xl border">
      <ComposerPrimitive.Input
        className="aui-edit-composer-input text-foreground web:resize-none web:outline-none min-h-14 px-4 pt-3 pb-1 text-base"
        multiline
        autoFocus
      />
      <View className="aui-edit-composer-footer mx-2.5 mb-2.5 flex-row items-center gap-1.5 self-end">
        <ComposerPrimitive.Cancel className="active:bg-accent h-8 justify-center rounded-full px-3.5">
          <Text className="text-foreground text-sm font-medium">Cancel</Text>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send className="bg-primary active:bg-primary/90 h-8 justify-center rounded-full px-3.5">
          <Text className="text-primary-foreground text-sm font-medium">
            Update
          </Text>
        </ComposerPrimitive.Send>
      </View>
    </ComposerPrimitive.Root>
  </MessagePrimitive.Root>
);

const BranchPicker: FC<ViewProps> = ({ className, ...rest }) => {
  const branchCount = useAuiState((s) => s.message.branchCount);
  if (branchCount <= 1) return null;

  return (
    <View
      className={cn(
        "aui-branch-picker-root -ms-2 me-2 flex-row items-center",
        className,
      )}
      {...rest}
    >
      <BranchPickerPrimitive.Previous
        className={cn(iconButtonClassName, "disabled:opacity-35")}
        hitSlop={4}
        accessibilityLabel="Previous"
      >
        <Icon as={ChevronLeftIcon} className="text-muted-foreground size-4" />
      </BranchPickerPrimitive.Previous>
      <Text className="aui-branch-picker-state text-muted-foreground text-xs font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </Text>
      <BranchPickerPrimitive.Next
        className={cn(iconButtonClassName, "disabled:opacity-35")}
        hitSlop={4}
        accessibilityLabel="Next"
      >
        <Icon as={ChevronRightIcon} className="text-muted-foreground size-4" />
      </BranchPickerPrimitive.Next>
    </View>
  );
};
