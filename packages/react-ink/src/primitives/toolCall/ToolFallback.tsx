import { type ReactNode, useMemo } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { ToolCallMessagePartStatus } from "@assistant-ui/core";
import type { ToolCallMessagePartProps } from "../../types";

export type ToolCallStatus =
  | "running"
  | "complete"
  | "error"
  | "requires-action";

type ToolFallbackBaseProps = Omit<
  ToolCallMessagePartProps,
  "addResult" | "resume"
> &
  Partial<Pick<ToolCallMessagePartProps, "addResult" | "resume">>;

const STATUS_ICONS: Record<Exclude<ToolCallStatus, "running">, string> = {
  complete: "+",
  error: "x",
  "requires-action": "?",
};

const STATUS_COLORS: Record<ToolCallStatus, string> = {
  running: "yellow",
  complete: "green",
  error: "red",
  "requires-action": "cyan",
};

const prettyPrintArgs = (argsText: string): string => {
  if (!argsText) return "";
  try {
    return JSON.stringify(JSON.parse(argsText), null, 2);
  } catch {
    return argsText;
  }
};

const formatResult = (result: unknown): string => {
  if (result === undefined || result === null) return "";
  if (typeof result === "string") return result;
  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
};

const truncate = (text: string, maxLines: number): string => {
  const lines = text.split("\n");
  if (lines.length <= maxLines) return text;
  return (
    lines.slice(0, maxLines).join("\n") +
    `\n... (${lines.length - maxLines} more lines)`
  );
};

export type ToolFallbackProps = ToolFallbackBaseProps & {
  /** Force expanded or collapsed. When unset, auto-expands while running, awaiting action, or errored. */
  expanded?: boolean;
  /** Maximum lines to show for args when expanded. Defaults to 20. */
  maxArgLines?: number;
  /** Maximum lines to show for result when expanded. Defaults to 20. */
  maxResultLines?: number;
  /** Maximum lines to show for result preview when collapsed. Defaults to 1. */
  maxResultPreviewLines?: number;
  /** Custom header renderer */
  renderHeader?: (props: {
    toolName: string;
    status: ToolCallStatus;
    expanded: boolean;
  }) => ReactNode;
  /** Custom args renderer */
  renderArgs?: (props: { args: unknown; argsText: string }) => ReactNode;
  /** Custom result renderer */
  renderResult?: (props: { result: unknown; isError: boolean }) => ReactNode;
};

const resolveStatus = (
  part: {
    interrupt: unknown;
    isError: boolean | undefined;
    result: unknown;
  },
  status?: ToolCallMessagePartStatus,
): ToolCallStatus => {
  if (status?.type === "requires-action") return "requires-action";
  if (status?.type === "incomplete") return "error";
  if (status?.type === "complete") return "complete";
  if (part.isError) return "error";
  if (part.result !== undefined) return "complete";
  if (part.interrupt) return "requires-action";
  return "running";
};

const getDisplayResult = (
  result: unknown,
  status?: ToolCallMessagePartStatus,
) => {
  if (result !== undefined) return result;
  if (status?.type === "incomplete") return status.error;
  return undefined;
};

const getFallbackErrorText = (status?: ToolCallMessagePartStatus) => {
  if (status?.type === "incomplete" && status.reason === "cancelled") {
    return "Tool call cancelled";
  }
  return "Tool call failed";
};

const StatusIcon = ({ status }: { status: ToolCallStatus }) => {
  if (status === "running") {
    return (
      <Text color={STATUS_COLORS.running}>
        <Spinner type="line" />
      </Text>
    );
  }
  return <Text color={STATUS_COLORS[status]}>{STATUS_ICONS[status]}</Text>;
};

export const ToolFallback = ({
  toolName,
  args,
  argsText,
  result: partResult,
  isError,
  interrupt,
  status,
  expanded: expandedProp,
  maxArgLines = 20,
  maxResultLines = 20,
  maxResultPreviewLines = 1,
  renderHeader,
  renderArgs,
  renderResult,
}: ToolFallbackProps) => {
  const displayStatus = resolveStatus(
    {
      interrupt,
      isError,
      result: partResult,
    },
    status,
  );
  const expanded =
    expandedProp ??
    (displayStatus === "running" ||
      displayStatus === "requires-action" ||
      displayStatus === "error");

  const result = getDisplayResult(partResult, status);
  const resultStr =
    result !== undefined || displayStatus === "error"
      ? formatResult(result)
      : "";
  const argsDisplay = useMemo(() => prettyPrintArgs(argsText), [argsText]);

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        {renderHeader ? (
          renderHeader({
            toolName,
            status: displayStatus,
            expanded,
          })
        ) : (
          <>
            <StatusIcon status={displayStatus} />
            <Text bold>{toolName}</Text>
            {!expanded && resultStr ? (
              <Text dimColor>{truncate(resultStr, maxResultPreviewLines)}</Text>
            ) : null}
          </>
        )}
      </Box>

      {expanded && (
        <Box flexDirection="column" marginLeft={2}>
          {argsText ? (
            <Box flexDirection="column">
              <Text dimColor>Args:</Text>
              {renderArgs ? (
                renderArgs({ args, argsText })
              ) : (
                <Text>{truncate(argsDisplay, maxArgLines)}</Text>
              )}
            </Box>
          ) : null}

          {partResult !== undefined || displayStatus === "error" ? (
            <Box flexDirection="column">
              <Text dimColor>
                {displayStatus === "error" ? "Error:" : "Result:"}
              </Text>
              {renderResult ? (
                renderResult({
                  result,
                  isError: displayStatus === "error",
                })
              ) : displayStatus === "error" ? (
                <Text color="red">
                  {truncate(
                    resultStr || getFallbackErrorText(status),
                    maxResultLines,
                  )}
                </Text>
              ) : (
                <Text>{truncate(resultStr, maxResultLines)}</Text>
              )}
            </Box>
          ) : null}

          {displayStatus === "running" && <Text dimColor>Running...</Text>}

          {displayStatus === "requires-action" && (
            <Text color="cyan">Waiting for approval...</Text>
          )}
        </Box>
      )}
    </Box>
  );
};
