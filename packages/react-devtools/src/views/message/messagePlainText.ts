import type { MessagePreview, PartPreview } from "./types";

const stringify = (value: unknown): string => {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const partPlainText = (part: PartPreview): string | null => {
  switch (part.type) {
    case "text":
    case "reasoning": {
      const text = part.text.trim();
      return text || null;
    }
    case "tool-call": {
      const lines = [`[tool] ${part.toolName}`];
      if (part.args !== undefined && part.args !== null) {
        lines.push(`args: ${stringify(part.args)}`);
      }
      if (part.result !== undefined) {
        lines.push(`result: ${stringify(part.result)}`);
      }
      return lines.join("\n");
    }
    case "source":
      return part.title ?? part.url ?? part.sourceType ?? null;
    case "image":
      return part.filename ? `[image] ${part.filename}` : "[image]";
    case "file":
      return part.filename ? `[file] ${part.filename}` : "[file]";
    case "audio":
      return part.format ? `[audio] ${part.format}` : "[audio]";
    case "data":
      return `[data${part.name ? `: ${part.name}` : ""}]\n${stringify(part.data)}`;
    case "generative-ui":
      return `[generative-ui]\n${stringify(part.spec)}`;
    default:
      return `[${part.rawType || "unknown"}]\n${stringify(part.raw)}`;
  }
};

/** Plain-text export of a message for clipboard copy. */
export const messagePlainText = (message: MessagePreview): string => {
  const blocks: string[] = [];

  if (message.attachments.length) {
    blocks.push(
      message.attachments
        .map((attachment) => `[attachment] ${attachment.name}`)
        .join("\n"),
    );
  }

  blocks.push(
    ...message.parts
      .map(partPlainText)
      .filter((block): block is string => Boolean(block)),
  );

  return blocks.join("\n\n");
};
