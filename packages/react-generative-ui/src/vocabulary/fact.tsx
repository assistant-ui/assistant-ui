import { z } from "zod";
import type { GenerativeUILibrary } from "../types";
import { toTextContent } from "./toTextContent";

export const factVocabulary = {
  Fact: {
    description:
      "A label/value pair, rendered as a key followed by its value. Use for compact metadata.",
    properties: z.object({
      label: z.string().describe("The fact label (key)."),
      value: z.string().describe("The fact value."),
    }),
    render: ({ label, value, children }) => (
      <dl data-aui="fact">
        <dt data-aui="fact-label">{toTextContent(label)}</dt>
        <dd data-aui="fact-value">
          {toTextContent(value)}
          {children}
        </dd>
      </dl>
    ),
  },
} satisfies GenerativeUILibrary;
