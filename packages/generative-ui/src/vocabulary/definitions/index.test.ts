import { describe, expect, it } from "vitest";
import { vocabularyDefinitions } from "./index";

const numericTextProps = [
  ["Header", { text: 101 }],
  ["Alert", { title: 102, description: 103 }],
  ["Fact", { label: 104, value: "ready" }],
  ["Card", { title: 105, confirm: { label: 106 }, cancel: { label: 107 } }],
  ["Select", { options: [], placeholder: 108 }],
  ["Checkbox", { label: 109 }],
  ["Button", { label: 110 }],
  ["Diagram", { code: "flowchart LR", title: 111 }],
] as const;

describe("vocabularyDefinitions", () => {
  it.each(numericTextProps)(
    "accepts numeric text props on %s",
    (name, props) => {
      expect(
        vocabularyDefinitions[name].properties.safeParse(props).success,
      ).toBe(true);
    },
  );
});
