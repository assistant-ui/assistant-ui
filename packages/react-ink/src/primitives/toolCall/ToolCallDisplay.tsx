import type { ReactNode } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { ToolCallMessagePart } from "@assistant-ui/core";

type ToolCallStatus = "running" | "complete" | "error" | "requires-action";

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

const formatArgs = (args: unknown): string => {
  if (args === undefined || args === null) return "";
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
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

export type ToolCallDisplayProps = {
  part: ToolCallMessagePart;
  /** Force expanded or collapsed. When unset, auto-expands while running and collapses when complete. */
  expanded?: boolean;
  /** Maximum lines to show for args when expanded. Defaults to 20. */
  maxArgLines?: number;
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

const resolveStatus = (part: ToolCallMessagePart): ToolCallStatus => {
  if (part.isError) return "error";
  if (part.result !== undefined) return "complete";
  if (part.interrupt) return "requires-action";
  return "running";
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

export const ToolCallDisplay = ({
  part,
  expanded: expandedProp,
  maxArgLines = 20,
  maxResultPreviewLines = 1,
  renderHeader,
  renderArgs,
  renderResult,
}: ToolCallDisplayProps) => {
  const status = resolveStatus(part);
  const expanded =
    expandedProp ?? (status === "running" || status === "requires-action");

  const argsStr = formatArgs(part.args);
  const resultStr = formatResult(part.result);

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        {renderHeader ? (
          renderHeader({
            toolName: part.toolName,
            status,
            expanded,
          })
        ) : (
          <>
            <StatusIcon status={status} />
            <Text bold>{part.toolName}</Text>
            {!expanded && resultStr ? (
              <Text dimColor>{truncate(resultStr, maxResultPreviewLines)}</Text>
            ) : null}
          </>
        )}
      </Box>

      {expanded && (
        <Box flexDirection="column" marginLeft={2}>
          {argsStr ? (
            <Box flexDirection="column">
              <Text dimColor>Args:</Text>
              {renderArgs ? (
                renderArgs({ args: part.args, argsText: part.argsText })
              ) : (
                <Text>{truncate(argsStr, maxArgLines)}</Text>
              )}
            </Box>
          ) : null}

          {part.result !== undefined ? (
            <Box flexDirection="column">
              <Text dimColor>{part.isError ? "Error:" : "Result:"}</Text>
              {renderResult ? (
                renderResult({
                  result: part.result,
                  isError: !!part.isError,
                })
              ) : part.isError ? (
                <Text color="red">{resultStr}</Text>
              ) : (
                <Text>{resultStr}</Text>
              )}
            </Box>
          ) : null}

          {status === "running" && <Text dimColor>Running...</Text>}

          {status === "requires-action" && (
            <Text color="cyan">Waiting for approval...</Text>
          )}
        </Box>
      )}
    </Box>
  );
};
