import { z } from "zod";
import type { GenerativeUILibrary } from "../types";
import { factTrend, formatFactDelta } from "./formatValue";
import { toTextContent } from "./toTextContent";

const factTone = (
  trend: "up" | "down" | "flat",
  upIsGood: unknown,
): "good" | "bad" | "neutral" => {
  if (trend === "flat") return "neutral";
  const positive = upIsGood !== false;
  const isGood = trend === "up" ? positive : !positive;
  return isGood ? "good" : "bad";
};

export const factVocabulary = {
  Fact: {
    description:
      "A label/value pair, rendered as a key followed by its value. Use for compact metadata.",
    properties: z.object({
      label: z.string().describe("The fact label (key)."),
      value: z.string().describe("The fact value."),
      delta: z.string().optional().describe("Change from before."),
      trend: z
        .enum(["up", "down", "flat"])
        .optional()
        .describe("Change direction."),
      upIsGood: z.boolean().optional().describe("Whether up is good."),
    }),
    render: ({ label, value, delta, trend, upIsGood, children }) => {
      const direction = factTrend(delta, trend);
      const tone = factTone(direction, upIsGood);

      return (
        <dl data-aui="fact">
          <dt data-aui="fact-label">{toTextContent(label)}</dt>
          <dd data-aui="fact-value">
            {toTextContent(value)}
            {typeof delta === "string" ? (
              <span
                data-aui="fact-delta"
                data-aui-trend={direction}
                data-aui-tone={tone}
              >
                {formatFactDelta(delta, direction)}
              </span>
            ) : null}
            {children}
          </dd>
        </dl>
      );
    },
  },
} satisfies GenerativeUILibrary;
