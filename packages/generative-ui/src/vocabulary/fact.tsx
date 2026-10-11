import type { GenerativeUILibrary } from "../types";
import { factDefinitions } from "./definitions/fact";
import { factTone, factTrend, formatFactDelta } from "./formatValue";
import { toTextContent } from "./toTextContent";

export const factVocabulary = {
  Fact: {
    ...factDefinitions.Fact,
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
