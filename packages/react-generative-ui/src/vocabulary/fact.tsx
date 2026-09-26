import { z } from "zod";
import type { GenerativeUILibrary } from "../types";
import { toTextContent } from "./toTextContent";

const factTrend = (delta: unknown, trend: unknown): "up" | "down" | "flat" => {
  if (trend === "down" || trend === "flat" || trend === "up") return trend;
  return typeof delta === "string" && /^[-\u2212]/.test(delta) ? "down" : "up";
};

const unsignedDelta = (delta: string, trend: "up" | "down" | "flat") =>
  trend === "up"
    ? delta.replace(/^\+/, "")
    : trend === "down"
      ? delta.replace(/^[-\u2212]/, "")
      : delta;

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
      const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";

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
                {arrow} {unsignedDelta(delta, direction)}
              </span>
            ) : null}
            {children}
          </dd>
        </dl>
      );
    },
  },
} satisfies GenerativeUILibrary;
