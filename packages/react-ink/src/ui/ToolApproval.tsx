import { useState, useEffect, useCallback, useId } from "react";
import { Box, Text, useFocus, useFocusManager, useInput } from "ink";
import { ToolResponse } from "assistant-stream";
import { prettyPrintArgs } from "../utils/prettyPrintArgs";

export type TrustLevel = "once" | "tool" | "session";

export type ToolApprovalProps = {
  /** Tool name being approved */
  toolName: string;
  /** Raw JSON string of tool arguments */
  argsText: string;

  /** Runtime callback to submit a tool result (used for rejection) */
  addResult: (result: unknown) => void;
  /** Runtime callback to resume an interrupted tool call (used for approval) */
  resume: (payload: unknown) => void;

  /** Interrupt payload from the runtime */
  interrupt?: { type: "human"; payload: unknown } | undefined;

  /**
   * Called when user sets a trust level for this tool.
   * The consuming app is responsible for persisting trust decisions.
   */
  onTrustChange?: ((toolName: string, level: TrustLevel) => void) | undefined;

  /** Auto-deny timeout in seconds. 0 = no timeout. Default: 0 */
  autoRejectTimeout?: number | undefined;

  /** Whether to show the args editor. Default: true */
  allowEdit?: boolean | undefined;

  /** Whether to show trust level options. Default: true */
  showTrustOptions?: boolean | undefined;

  /** Custom labels for the approval UI */
  labels?: {
    approve?: string;
    reject?: string;
    edit?: string;
    trustTool?: string;
    trustSession?: string;
  };
};

type ApprovalState = "idle" | "editing" | "resolved";

const DEFAULT_LABELS = {
  approve: "Allow",
  reject: "Deny",
  edit: "Edit",
  trustTool: "Always allow",
  trustSession: "Allow all this session",
};

export const ToolApproval = ({
  toolName,
  argsText,
  addResult,
  resume,
  interrupt,
  onTrustChange,
  autoRejectTimeout = 0,
  allowEdit = !!interrupt,
  showTrustOptions = true,
  labels: labelsProp,
}: ToolApprovalProps) => {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const [state, setState] = useState<ApprovalState>("idle");
  const isActive = state !== "resolved";
  const focusId = useId();
  const { isFocused } = useFocus({ id: focusId, isActive });
  const { focus, focusNext } = useFocusManager();

  // Steal focus from ComposerInput when this component mounts
  useEffect(() => {
    focus(focusId);
  }, [focus, focusId]);

  // Return focus to the next focusable component (ComposerInput) on resolve
  useEffect(() => {
    if (state === "resolved") {
      focusNext();
    }
  }, [state, focusNext]);

  const [editText, setEditText] = useState(() => prettyPrintArgs(argsText));
  const [editError, setEditError] = useState("");
  const [countdown, setCountdown] = useState(autoRejectTimeout);

  const doApprove = useCallback(
    (trustLevel?: TrustLevel) => {
      if (state === "resolved") return;
      setState("resolved");
      if (trustLevel && trustLevel !== "once") {
        onTrustChange?.(toolName, trustLevel);
      }
      if (interrupt) {
        // Interrupt-based flow (context.human()): resume the promise
        resume({ approved: true });
      } else {
        // Human-tool-names flow: provide a result so shouldContinue() proceeds
        addResult("Approved by user");
      }
    },
    [state, onTrustChange, toolName, interrupt, resume, addResult],
  );

  const doReject = useCallback(() => {
    if (state === "resolved") return;
    setState("resolved");
    if (interrupt) {
      resume({ approved: false });
    } else {
      addResult(
        new ToolResponse({
          result: "User denied tool execution",
          isError: true,
        }),
      );
    }
  }, [state, interrupt, resume, addResult]);

  const doEditSubmit = useCallback(() => {
    if (state !== "editing") return;
    try {
      const edited = JSON.parse(editText);
      setState("resolved");
      if (interrupt) {
        resume({ approved: true, args: edited });
      } else {
        addResult("Approved by user");
      }
    } catch {
      setEditError("Invalid JSON — fix and retry, or Esc to cancel");
    }
  }, [state, editText, interrupt, resume, addResult]);

  // Auto-deny countdown — pure decrement, no side effects in updater
  useEffect(() => {
    if (autoRejectTimeout <= 0 || state !== "idle") return;
    const interval = setInterval(() => {
      setCountdown((c) => Math.max(c - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRejectTimeout, state]);

  // Trigger rejection when countdown hits zero
  useEffect(() => {
    if (countdown === 0 && autoRejectTimeout > 0 && state === "idle") {
      doReject();
    }
  }, [countdown, autoRejectTimeout, state, doReject]);

  useInput(
    (input, key) => {
      if (state === "resolved") return;

      if (state === "editing") {
        if (key.escape) {
          setState("idle");
          return;
        }
        if (key.return) {
          doEditSubmit();
          return;
        }
        if (key.backspace || key.delete) {
          setEditText((t) => t.slice(0, -1));
          return;
        }
        if (input && !key.ctrl && !key.meta) {
          setEditText((t) => t + input);
          setEditError("");
        }
        return;
      }

      // idle state
      const lower = input.toLowerCase();
      if (lower === "y") doApprove("once");
      else if (lower === "n" || key.escape) doReject();
      else if (lower === "e" && allowEdit && argsText) setState("editing");
      else if (lower === "a" && showTrustOptions) doApprove("tool");
      else if (lower === "s" && showTrustOptions) doApprove("session");
    },
    { isActive: isFocused && state !== "resolved" },
  );

  if (state === "resolved") return null;

  if (state === "editing") {
    return (
      <Box flexDirection="column">
        <Text dimColor>Edit args (Enter to submit, Esc to cancel):</Text>
        <Text>
          {editText}
          <Text inverse> </Text>
        </Text>
        {editError ? <Text color="red">{editError}</Text> : null}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Text color="green" bold>
          [Y]
        </Text>
        <Text>{labels.approve}</Text>
        <Text color="red" bold>
          [N]
        </Text>
        <Text>{labels.reject}</Text>
        {allowEdit && argsText ? (
          <>
            <Text color="yellow" bold>
              [E]
            </Text>
            <Text>{labels.edit}</Text>
          </>
        ) : null}
      </Box>
      {showTrustOptions ? (
        <Box gap={1}>
          <Text dimColor>
            <Text bold>[A]</Text> {labels.trustTool} {toolName}
          </Text>
          <Text dimColor>
            <Text bold>[S]</Text> {labels.trustSession}
          </Text>
        </Box>
      ) : null}
      {countdown > 0 ? <Text dimColor>Auto-deny in {countdown}s</Text> : null}
    </Box>
  );
};
