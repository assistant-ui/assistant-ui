import type { GenerativeUILibrary } from "../types";
import { textDefinitions } from "./definitions/text";
import { toTextContent } from "./toTextContent";

export const textVocabulary = {
  Header: {
    ...textDefinitions.Header,
    render: ({ text, size, children }) => (
      <h2 data-aui="header" data-aui-size={size ?? "lg"}>
        {toTextContent(text)}
        {children}
      </h2>
    ),
  },
  Text: {
    ...textDefinitions.Text,
    render: ({ value, size, weight, color, children }) => (
      <span
        data-aui="text"
        data-aui-size={size ?? "md"}
        data-aui-weight={weight}
        data-aui-color={color}
      >
        {toTextContent(value)}
        {children}
      </span>
    ),
  },
  Caption: {
    ...textDefinitions.Caption,
    render: ({ value, children }) => (
      <p data-aui="caption">
        {toTextContent(value)}
        {children}
      </p>
    ),
  },
} satisfies GenerativeUILibrary;
