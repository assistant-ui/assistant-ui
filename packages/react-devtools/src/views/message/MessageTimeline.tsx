import { useMemo } from "react";
import { ChainOfThought } from "./ChainOfThought";
import { partKey } from "./parse";
import { PartView } from "./PartView";
import type { PartPreview } from "./types";

const isThoughtPart = (part: PartPreview) =>
  part.type === "reasoning" || part.type === "tool-call";

export const MessageTimeline = ({
  parts,
}: {
  parts: readonly PartPreview[];
}) => {
  const { prefix, body, useCotPrefix } = useMemo(() => {
    const firstTextIdx = parts.findIndex((part) => part.type === "text");
    const prefix = firstTextIdx > 0 ? parts.slice(0, firstTextIdx) : [];
    const body = firstTextIdx >= 0 ? parts.slice(firstTextIdx) : parts;
    const useCotPrefix =
      prefix.length >= 2 &&
      prefix.every(isThoughtPart) &&
      prefix.some((part) => part.type === "reasoning");

    return { prefix, body, useCotPrefix };
  }, [parts]);

  if (!parts.length) return null;

  const items = useCotPrefix ? body : parts;

  return (
    <div className="flex flex-col gap-1">
      {useCotPrefix ? <ChainOfThought parts={prefix} /> : null}
      {items.map((part, index) => {
        const globalIndex = useCotPrefix ? prefix.length + index : index;
        return (
          <PartView key={partKey(part, globalIndex)} part={part} compact />
        );
      })}
    </div>
  );
};

export const messageToolCount = (parts: readonly PartPreview[]) =>
  parts.filter((part) => part.type === "tool-call").length;

export const messageStepCount = (parts: readonly PartPreview[]) => {
  const tools = messageToolCount(parts);
  const texts = parts.filter((part) => part.type === "text").length;
  return { tools, texts };
};
