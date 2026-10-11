import { toTextContent } from "../../vocabulary/toTextContent";

/** A model-written value as Vue children: its text, or nothing, so no empty comment node is rendered. */
export const textChildren = (value: unknown): string[] => {
  const text = toTextContent(value);
  return text === null ? [] : [String(text)];
};
