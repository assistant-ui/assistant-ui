import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import {
  toolApprovalAcceptsText,
  type ToolApprovalOption,
  type ToolCallMessagePart,
  type ToolCallMessagePartComponent,
  type ToolCallMessagePartProps,
  type ToolCallMessagePartStatus,
} from "@assistant-ui/react-native";
import { WrenchIcon } from "lucide-react-native";
import { type FC, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  field,
  inkButton,
  mono,
  monoStyle,
  textButtonHitSlop,
  useAnnounce,
  useHydrated,
  webLiveRegion,
} from "./surfaces";
import { formatUnknownValue } from "../utils/task";

const APPROVED_RESULT = "Approved by user";
const DENIED_RESULT = "User denied tool execution";

const APPROVAL_OPTION_DEFAULT_LABELS: Record<string, string> = {
  "allow-once": "Allow",
  "allow-always": "Always allow",
  "reject-once": "Deny",
  "reject-always": "Always deny",
};

const isKnownKind = (kind: string) =>
  Object.hasOwn(APPROVAL_OPTION_DEFAULT_LABELS, kind);

const isAllowKind = (kind: string) =>
  kind === "allow-once" || kind === "allow-always";

const approvalOptionLabel = (option: ToolApprovalOption) =>
  option.label ??
  (isKnownKind(option.kind)
    ? APPROVAL_OPTION_DEFAULT_LABELS[option.kind]
    : undefined) ??
  option.id;

const isQuestion = (approval: ToolCallMessagePart["approval"]) =>
  approval?.display === "select" || approval?.display === "text";

export const offersInterruptAction = (
  status: ToolCallMessagePartStatus | undefined,
  approval: ToolCallMessagePart["approval"],
  interrupt: ToolCallMessagePart["interrupt"],
) =>
  status?.type !== "requires-action" ||
  status.reason !== "interrupt" ||
  approval != null ||
  interrupt != null;

const ApprovalButton: FC<{
  label: string;
  primary?: boolean;
  disabled: boolean;
  onPress: () => void;
}> = ({ label, primary = false, disabled, onPress }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={textButtonHitSlop}
    className={cn(
      "h-8 justify-center rounded-full px-3.5 disabled:opacity-50",
      primary ? inkButton : "border-border/60 active:bg-foreground/5 border",
    )}
  >
    <Text
      className={cn(
        "text-xs font-medium",
        primary ? "text-background" : "text-foreground",
      )}
    >
      {label}
    </Text>
  </Pressable>
);

export const ToolFallbackApproval: FC<
  Partial<
    Pick<
      ToolCallMessagePartProps,
      "addResult" | "resume" | "respondToApproval" | "status"
    >
  > & {
    interrupt?: ToolCallMessagePart["interrupt"];
    approval?: ToolCallMessagePart["approval"];
    argsText?: string;
    className?: string;
  }
> = ({
  addResult,
  resume,
  interrupt,
  approval,
  respondToApproval,
  status,
  argsText,
  className,
}) => {
  const hydrated = useHydrated();
  const [submitted, setSubmitted] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  useAnnounce(error ?? undefined);

  if (
    approval != null &&
    (approval.approved !== undefined || approval.resolution !== undefined)
  )
    return null;

  if (!offersInterruptAction(status, approval, interrupt)) return null;

  // A declared option list is a host constraint: the kit never adds an
  // approval path beyond it, and keeps a refusal path only for an action.
  const declaredOptions = respondToApproval ? approval?.options : undefined;
  const acceptsText =
    approval != null &&
    respondToApproval != null &&
    toolApprovalAcceptsText(approval);

  const submit = (send: () => Promise<void> | void) => {
    setSubmitted(true);
    setError(null);
    void (async () => {
      try {
        await send();
      } catch (sendError) {
        setSubmitted(false);
        setError(
          sendError instanceof Error ? sendError.message : String(sendError),
        );
      }
    })();
  };

  const typedNote = () => (answer.trim() ? { text: answer } : {});

  const respond = (approved: boolean) => {
    if (submitted) return;
    if (
      approval != null &&
      approval.approved === undefined &&
      respondToApproval
    ) {
      submit(() => respondToApproval({ approved, ...typedNote() }));
    } else if (interrupt) {
      submit(() => resume?.({ approved }));
    } else if (
      status?.type === "requires-action" &&
      status.reason === "interrupt"
    ) {
      return;
    } else {
      submit(() => addResult?.(approved ? APPROVED_RESULT : DENIED_RESULT));
    }
  };

  // A custom kind has no decision class for the runtime to derive, so picking
  // one resolves as approved.
  const respondWithOption = (option: ToolApprovalOption) => {
    if (submitted) return;
    setConfirmingId(null);
    submit(() =>
      respondToApproval?.(
        isKnownKind(option.kind)
          ? { optionId: option.id, ...typedNote() }
          : { optionId: option.id, approved: true, ...typedNote() },
      ),
    );
  };

  // An empty answer is sent as given; a host that cannot record one rejects
  // it, which reopens the controls.
  const submitAnswer = () => {
    if (submitted) return;
    submit(() => respondToApproval?.({ text: answer }));
  };

  const dismiss = () => {
    if (submitted) return;
    submit(() => respondToApproval?.({ approved: false }));
  };

  const handleOption = (option: ToolApprovalOption) => {
    if (option.confirm) {
      setConfirmingId(option.id);
    } else {
      respondWithOption(option);
    }
  };

  const confirming =
    confirmingId != null
      ? declaredOptions?.find((o) => o.id === confirmingId)
      : undefined;

  const question = isQuestion(approval);
  const dismissible =
    question && respondToApproval != null && approval?.dismissible === true;

  const dismissButton = dismissible ? (
    <ApprovalButton label="Dismiss" disabled={submitted} onPress={dismiss} />
  ) : null;

  const subject = argsText ? (
    <View
      className={cn(
        "aui-tool-fallback-approval-args rounded-lg px-2.5 py-2",
        field,
      )}
    >
      <Text className="text-foreground/70 text-xs" style={monoStyle} selectable>
        {argsText}
      </Text>
    </View>
  ) : null;

  const promptText = approval?.prompt ? (
    <Text className="aui-tool-fallback-approval-prompt text-foreground text-sm">
      {approval.prompt}
    </Text>
  ) : null;

  const errorText = error ? (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion={webLiveRegion}
      className="aui-tool-fallback-approval-error text-destructive text-xs"
    >
      {error}
    </Text>
  ) : null;

  const answerField = acceptsText ? (
    <View className="aui-tool-fallback-approval-answer gap-2">
      <TextInput
        value={answer}
        onChangeText={setAnswer}
        editable={!submitted}
        multiline
        textAlignVertical="top"
        accessibilityLabel={question ? (approval?.prompt ?? "Answer") : "Note"}
        placeholder={
          question ? "Type your answer" : "Add a note to your decision"
        }
        placeholderTextColorClassName={
          hydrated ? "accent-muted-foreground/60" : undefined
        }
        className={cn(
          "text-foreground web:resize-none web:outline-none min-h-16 rounded-lg px-2.5 py-2 text-sm",
          field,
        )}
      />
      {question && (
        <View className="flex-row flex-wrap items-center gap-2">
          <ApprovalButton
            label="Send"
            primary
            disabled={submitted}
            onPress={submitAnswer}
          />
          {dismissButton}
        </View>
      )}
    </View>
  ) : null;

  if (confirming) {
    const confirmMeta =
      typeof confirming.confirm === "object" ? confirming.confirm : undefined;
    const confirmDescription =
      confirmMeta?.description ?? confirming.description;
    return (
      <View
        className={cn("aui-tool-fallback-approval-confirm gap-2", className)}
      >
        <Text className="text-foreground text-sm font-semibold">
          {confirmMeta?.title ?? `${approvalOptionLabel(confirming)}?`}
        </Text>
        {confirmDescription && (
          <Text className="text-muted-foreground text-sm">
            {confirmDescription}
          </Text>
        )}
        {confirming.grants && confirming.grants.length > 0 && (
          <View className="aui-tool-fallback-approval-confirm-grants items-start gap-1">
            {confirming.grants.map((grant) => (
              <View key={grant} className={cn("rounded px-1.5 py-0.5", field)}>
                <Text
                  className={cn(mono, "text-foreground")}
                  style={monoStyle}
                  selectable
                >
                  {grant}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View className="flex-row flex-wrap items-center gap-2">
          <ApprovalButton
            label="Confirm"
            primary
            disabled={submitted}
            onPress={() => respondWithOption(confirming)}
          />
          <ApprovalButton
            label="Back"
            disabled={submitted}
            onPress={() => setConfirmingId(null)}
          />
        </View>
      </View>
    );
  }

  if (declaredOptions && declaredOptions.length > 0) {
    const allowOptions = declaredOptions.filter((o) => isAllowKind(o.kind));
    const customOptions = declaredOptions.filter((o) => !isKnownKind(o.kind));
    const rejectOptions = declaredOptions.filter(
      (o) => isKnownKind(o.kind) && !isAllowKind(o.kind),
    );
    return (
      <View className={cn("aui-tool-fallback-approval gap-2", className)}>
        {subject}
        {promptText}
        <View className="flex-row flex-wrap items-center gap-2">
          {[...allowOptions, ...customOptions, ...rejectOptions].map(
            (option) => (
              <ApprovalButton
                key={option.id}
                label={approvalOptionLabel(option)}
                primary={option === allowOptions[0]}
                disabled={submitted}
                onPress={() => handleOption(option)}
              />
            ),
          )}
          {rejectOptions.length === 0 && !question && (
            <ApprovalButton
              label="Deny"
              disabled={submitted}
              onPress={() => respond(false)}
            />
          )}
          {!acceptsText && dismissButton}
        </View>
        {answerField}
        {errorText}
      </View>
    );
  }

  // A question carries no decision to fabricate, so it renders only what the
  // request declared.
  if (question) {
    return (
      <View className={cn("aui-tool-fallback-approval gap-2", className)}>
        {subject}
        {promptText}
        {answerField}
        {!acceptsText && dismissButton && (
          <View className="flex-row flex-wrap items-center gap-2">
            {dismissButton}
          </View>
        )}
        {errorText}
      </View>
    );
  }

  return (
    <View className={cn("aui-tool-fallback-approval gap-2", className)}>
      {subject}
      {promptText}
      <View className="flex-row flex-wrap items-center gap-2">
        <ApprovalButton
          label="Allow"
          primary
          disabled={submitted}
          onPress={() => respond(true)}
        />
        <ApprovalButton
          label="Deny"
          disabled={submitted}
          onPress={() => respond(false)}
        />
      </View>
      {answerField}
      {errorText}
    </View>
  );
};

export const ToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  status,
  approval,
  interrupt,
  addResult,
  resume,
  respondToApproval,
}) => {
  const isCancelled =
    status.type === "incomplete" && status.reason === "cancelled";
  const label =
    status.type === "running"
      ? `Running ${toolName}…`
      : status.type === "requires-action"
        ? `Waiting on ${toolName}`
        : status.type === "incomplete"
          ? `${isCancelled ? "Cancelled" : "Failed"} ${toolName}`
          : `Used ${toolName}`;
  const error =
    status.type === "incomplete" && status.error != null
      ? formatUnknownValue(status.error)
      : "";
  const shouldRenderApproval =
    status.type === "requires-action" &&
    offersInterruptAction(status, approval, interrupt);

  return (
    <View className="aui-tool-fallback-root border-border bg-card my-1 gap-2 rounded-xl border px-3 py-2">
      <View className="aui-tool-fallback-header flex-row items-center gap-2">
        <Icon as={WrenchIcon} className="text-muted-foreground size-4" />
        <Text className="aui-tool-fallback-title text-muted-foreground text-sm">
          {label}
        </Text>
      </View>
      {error !== "" && (
        <View className="aui-tool-fallback-error gap-0.5 ps-6">
          <Text className="text-muted-foreground text-xs font-semibold">
            {isCancelled ? "Cancelled reason:" : "Error:"}
          </Text>
          <Text className="text-muted-foreground text-xs" selectable>
            {error}
          </Text>
        </View>
      )}
      {shouldRenderApproval && (
        <ToolFallbackApproval
          className="ps-6"
          argsText={argsText}
          status={status}
          approval={approval}
          interrupt={interrupt}
          addResult={addResult}
          resume={resume}
          respondToApproval={respondToApproval}
        />
      )}
    </View>
  );
};
