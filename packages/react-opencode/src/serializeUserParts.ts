import type { ThreadUserMessagePart } from "./types";

export const serializeUserParts = (parts: readonly ThreadUserMessagePart[]) => {
  return parts
    .map((part) => {
      if (part.type === "text") return part.text;
      if (part.type === "image") return part.filename ?? part.image;
      if (part.type === "file") return part.filename ?? part.data;
      if (part.type === "data") return JSON.stringify(part.data);
      if (part.type === "audio") return part.audio.data;
      return "";
    })
    .join("\n");
};
