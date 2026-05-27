import { describe, expect, it } from "vitest";
import { isLeakedInlineToolText } from "./inline-tool-leak";

describe("inline-tool-leak", () => {
  it("detects leaked generate_chart args", () => {
    const args = JSON.stringify({
      title: "Quarterly Revenue",
      type: "bar",
      data: [
        { Quarter: "Q1", Revenue: 45 },
        { Quarter: "Q2", Revenue: 52 },
      ],
      xKey: "Quarter",
      dataKeys: ["Revenue"],
    });

    expect(isLeakedInlineToolText(args)).toBe(true);
    expect(isLeakedInlineToolText("```json\n" + args + "\n```")).toBe(true);
  });

  it("matches argsText from sibling tool-call parts", () => {
    const args = '{"name":"Eiffel Tower","lat":48.858,"lng":2.294}';
    expect(isLeakedInlineToolText(args, [args])).toBe(true);
    expect(
      isLeakedInlineToolText(
        '{"name":"Eiffel Tower","lat":48.858,"lng":2.294}',
        ['{"lat":48.858,"lng":2.294,"name":"Eiffel Tower"}'],
      ),
    ).toBe(true);
  });

  it("allows normal assistant prose", () => {
    expect(
      isLeakedInlineToolText("Here is your quarterly revenue chart."),
    ).toBe(false);
    expect(isLeakedInlineToolText("Q1 was strong at $45k.")).toBe(false);
  });
});
