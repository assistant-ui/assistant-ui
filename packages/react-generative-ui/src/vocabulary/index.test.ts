import { describe, it, expect } from "vitest";
import { buildPresentParameters } from "../buildPresentParameters";
import { defaultGenerativeUILibrary } from "./index";

const EXPECTED_KEYS = [
  "Header",
  "Text",
  "Caption",
  "Image",
  "Divider",
  "Fact",
  "Button",
  "Select",
  "Input",
  "DatePicker",
  "Checkbox",
  "RadioGroup",
  "Form",
  "Card",
  "Col",
  "Row",
  "Spacer",
  "Badge",
  "Box",
  "ListView",
  "ListViewItem",
  "Table",
  "Markdown",
  "Chart",
  "Alert",
  "Carousel",
  "Icon",
] as const;

describe("defaultGenerativeUILibrary", () => {
  it("exposes exactly the closed vocabulary set, no stray or missing entries", () => {
    expect(Object.keys(defaultGenerativeUILibrary).sort()).toEqual(
      [...EXPECTED_KEYS].sort(),
    );
  });

  it("every entry has a description, a zod properties schema, and a render fn", () => {
    for (const [name, entry] of Object.entries(defaultGenerativeUILibrary)) {
      expect(typeof entry.description, `${name}.description`).toBe("string");
      expect(typeof entry.render, `${name}.render`).toBe("function");
      expect(
        typeof (entry.properties as { safeParse?: unknown }).safeParse,
        `${name}.properties is a zod schema`,
      ).toBe("function");
    }
  });

  it("buildPresentParameters produces a $type enum of the vocabulary names", () => {
    const schema = buildPresentParameters(defaultGenerativeUILibrary) as Record<
      string,
      unknown
    >;
    const typeProp = (schema.properties as Record<string, unknown>)[
      "$type"
    ] as { enum?: unknown[] };
    expect(typeProp.enum).toEqual([...EXPECTED_KEYS]);
  });
});
