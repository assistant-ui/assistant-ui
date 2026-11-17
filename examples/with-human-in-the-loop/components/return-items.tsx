"use client";

import {
  useAuiState,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import {
  OptionList,
  type OptionListOption,
} from "@/components/assistant-ui/elements/option-list";

export const ReturnItems: ToolCallMessagePartComponent<
  { orderId: string; items: OptionListOption[] },
  { selected: string[] }
> = ({ args, status, result, isError, addResult }) => {
  const canAnswer = useAuiState((s) => s.thread.capabilities.answerToolCall);
  const waiting = status.type === "requires-action" && canAnswer;
  const unanswered = isError || status.type === "incomplete" ? [] : undefined;

  return (
    <OptionList
      aria-label={`Items to refund from order ${args.orderId}`}
      className="my-2"
      selectionMode="multiple"
      confirmLabel="Confirm items"
      options={args.items ?? []}
      choice={result?.selected ?? unanswered}
      onConfirm={waiting ? (ids) => addResult({ selected: ids }) : undefined}
    />
  );
};
