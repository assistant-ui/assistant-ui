import { Icon } from "@/components/ui/icon";
import type {
  ToolCallMessagePart,
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
  ToolCallMessagePartStatus,
  ToolApprovalOption,
} from "@assistant-ui/react-native";
import { WrenchIcon } from "lucide-react-native";
import type { FC } from "react";
import { Text, View } from "react-native";
import { ApprovalCard } from "./approval-card";
import { formatUnknownValue } from "../utils/task";

export const offersInterruptAction = (
  status: ToolCallMessagePartStatus | undefined,
  approval: ToolCallMessagePart["approval"],
  interrupt: ToolCallMessagePart["interrupt"],
) =>
  status?.type !== "requires-action" ||
  status.reason !== "interrupt" ||
  approval != null ||
  interrupt != null;

type ToolFallbackApprovalProps = Pick<
  ToolCallMessagePartProps,
  "toolName" | "argsText" | "status" | "approval" | "interrupt"
> &
  Partial<
    Pick<ToolCallMessagePartProps, "addResult" | "resume" | "respondToApproval">
  >;

const APPROVED_RESULT = "Approved by user";
const DENIED_RESULT = "User denied tool execution";

const optionOf = (options: readonly ToolApprovalOption[], kind: string) =>
  options.find((option) => option.kind === kind);

const submit = (send: () => Promise<void> | void) => {
  void Promise.resolve()
    .then(send)
    .catch(() => {});
};

export const ToolFallbackApproval: FC<ToolFallbackApprovalProps> = ({
  toolName,
  argsText,
  status,
  approval,
  interrupt,
  addResult,
  resume,
  respondToApproval,
}) => {
  if (
    !offersInterruptAction(status, approval, interrupt) ||
    (approval !== undefined &&
      (approval.approved !== undefined || approval.resolution !== undefined))
  ) {
    return null;
  }

  const respond = (approved: boolean) => {
    if (approval !== undefined) {
      if (respondToApproval === undefined) return;
      submit(() => respondToApproval({ approved }));
    } else if (interrupt !== undefined) {
      if (resume === undefined) return;
      submit(() => resume({ approved }));
    } else if (
      status?.type === "requires-action" &&
      status.reason === "interrupt"
    ) {
      return;
    } else {
      if (addResult === undefined) return;
      submit(() => addResult(approved ? APPROVED_RESULT : DENIED_RESULT));
    }
  };

  const options = approval?.options;
  const hasOptions = options !== undefined && options.length > 0;
  const allowOnce = optionOf(options ?? [], "allow-once");
  const allowAlways = optionOf(options ?? [], "allow-always");
  const rejectOnce = optionOf(options ?? [], "reject-once");
  const onAllowOnce = allowOnce
    ? () => submit(() => respondToApproval?.({ optionId: allowOnce.id }))
    : hasOptions
      ? undefined
      : () => respond(true);
  const onAlwaysAllow = allowAlways
    ? () => submit(() => respondToApproval?.({ optionId: allowAlways.id }))
    : undefined;
  const onDeny = rejectOnce
    ? () => submit(() => respondToApproval?.({ optionId: rejectOnce.id }))
    : hasOptions
      ? undefined
      : () => respond(false);

  return (
    <ApprovalCard
      state="request"
      title={`Run ${toolName}`}
      subtitle={approval?.prompt ?? "Needs your approval"}
      command={argsText}
      {...(onAllowOnce && { onAllowOnce })}
      {...(onAlwaysAllow && { onAlwaysAllow })}
      {...(onDeny && { onDeny })}
    />
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
      : status.type === "incomplete"
        ? `${isCancelled ? "Cancelled" : "Failed"} ${toolName}`
        : `Used ${toolName}`;
  const error =
    status.type === "incomplete" && status.error != null
      ? formatUnknownValue(status.error)
      : undefined;
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
      {error !== undefined && (
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
          toolName={toolName}
          argsText={argsText}
          status={status}
          {...(approval !== undefined && { approval })}
          {...(interrupt !== undefined && { interrupt })}
          addResult={addResult}
          resume={resume}
          respondToApproval={respondToApproval}
        />
      )}
    </View>
  );
};
