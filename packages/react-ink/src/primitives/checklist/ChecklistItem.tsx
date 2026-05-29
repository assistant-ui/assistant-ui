import type { ComponentProps } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { ChecklistItemData, ChecklistItemStatus } from "./types";

export type ChecklistItemProps = ComponentProps<typeof Box> & {
  item: ChecklistItemData;
  depth?: number | undefined;
  maxDepth?: number | undefined;
};

const STATUS_INDICATORS: Record<
  Exclude<ChecklistItemStatus, "running">,
  string
> = {
  pending: "□",
  complete: "■",
  error: "x",
};

const STATUS_COLORS: Record<Exclude<ChecklistItemStatus, "pending">, string> = {
  running: "yellow",
  complete: "green",
  error: "red",
};

const ChecklistIndicator = ({ status }: { status: ChecklistItemStatus }) => {
  if (status === "running") {
    return (
      <Text color={STATUS_COLORS.running}>
        <Spinner type="line" />
      </Text>
    );
  }
  if (status === "pending") {
    return <Text dimColor>{STATUS_INDICATORS.pending}</Text>;
  }
  return <Text color={STATUS_COLORS[status]}>{STATUS_INDICATORS[status]}</Text>;
};

export const ChecklistItem = ({
  item,
  depth = 0,
  maxDepth = 2,
  ...boxProps
}: ChecklistItemProps) => {
  const children =
    item.children && depth < maxDepth
      ? item.children.map((child) => (
          <ChecklistItem
            key={child.id}
            item={child}
            depth={depth + 1}
            maxDepth={maxDepth}
          />
        ))
      : null;

  return (
    <Box flexDirection="column" {...boxProps}>
      <Box marginLeft={depth * 2} gap={1}>
        <ChecklistIndicator status={item.status} />
        {item.status === "pending" ? (
          <Text dimColor>{item.text}</Text>
        ) : (
          <Text
            bold={item.status === "running"}
            color={STATUS_COLORS[item.status]}
          >
            {item.text}
          </Text>
        )}
        {item.detail ? <Text dimColor>({item.detail})</Text> : null}
      </Box>
      {children}
    </Box>
  );
};

ChecklistItem.displayName = "ChecklistPrimitive.Item";
