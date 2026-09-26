import { describe, expect, it } from "vitest";
import { AUI_ELEMENT_DOCS } from "./aui-element-docs";
import { ELEMENT_DOCS } from "./element-docs";

describe("element docs", () => {
  it("keeps the AUI docs as the no-MDX fallback", () => {
    expect(ELEMENT_DOCS).toEqual(AUI_ELEMENT_DOCS);
    expect(ELEMENT_DOCS["conversation-map"]).toBeDefined();
  });
});
