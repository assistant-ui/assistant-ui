import type { ComponentProps, ReactNode } from "react";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import type { ChecklistItemData } from "@assistant-ui/core";

export type ChecklistItemProps = ComponentProps<typeof Box> & {
  item: ChecklistItemData;
  depth?: number;
  maxDepth?: number;
  renderItem?: (props: { item: ChecklistItemData; depth: number }) => ReactNode;
};

const STATUS_INDICATORS: Record<string, string> = {
  pending: "□",
  complete: "■",
  error: "x",
};

const STATUS_COLORS: Record<string, string | undefined> = {
  pending: undefined,
  running: "yellow",
  complete: "green",
  error: "red",
};

export const ChecklistItem = ({
  item,
  depth = 0,
  maxDepth = 2,
  renderItem,
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
            renderItem={renderItem}
          />
        ))
      : null;

  if (renderItem) {
    return (
      <>
        {renderItem({ item, depth })}
        {children}
      </>
    );
  }

  const color = STATUS_COLORS[item.status];
  const isRunning = item.status === "running";
  const isPending = item.status === "pending";

  return (
    <Box flexDirection="column" {...boxProps}>
      <Box marginLeft={depth * 2} gap={1}>
        {isRunning ? (
          <Text {...(color ? { color } : undefined)}>
            <Spinner type="line" />
          </Text>
        ) : (
          <Text {...(color ? { color } : undefined)} dimColor={isPending}>
            {STATUS_INDICATORS[item.status]}
          </Text>
        )}
        <Text
          bold={isRunning}
          dimColor={isPending}
          {...(color ? { color } : undefined)}
        >
          {item.text}
        </Text>
        {item.detail ? <Text dimColor>({item.detail})</Text> : null}
      </Box>
      {children}
    </Box>
  );
};

ChecklistItem.displayName = "ChecklistPrimitive.Item";
