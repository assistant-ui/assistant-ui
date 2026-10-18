import { describe, expect, it } from "vitest";
import { defaultDirectiveFormatter } from "./directive-formatter";

describe("directive field roundtrips", () => {
  it.each([
    { type: "file", label: "[id].tsx", id: "src/pages/[id].tsx" },
    { type: "file", label: "route.ts", id: "src/routes/{user}/route.ts" },
    { type: "user", label: "Alex [support]", id: "user-42" },
    { type: "file", label: "[id].tsx", id: "[id].tsx" },
    { type: "file", label: 'a]"b\\c', id: 'c}d"e\\f' },
    { type: "file", label: "目录 [首页]", id: "目录/{首页}" },
    { type: "file", label: "]".repeat(1024), id: "}".repeat(1024) },
  ])("preserves $label and its ID", (item) => {
    const text = defaultDirectiveFormatter.serialize(item);
    expect(defaultDirectiveFormatter.parse(text)).toEqual([
      { kind: "mention", ...item },
    ]);
  });

  it("keeps ordinary directives and stored backslashes literal", () => {
    const item = {
      type: "file",
      label: "C:\\files\\",
      id: "\\\\server\\files\\",
    };
    const text = String.raw`:file[C:\files\]{name=\\server\files\}`;
    expect(defaultDirectiveFormatter.serialize(item)).toBe(text);
    expect(defaultDirectiveFormatter.parse(text)).toEqual([
      { kind: "mention", ...item },
    ]);
  });

  it("uses quoted fields only when a delimiter needs encoding", () => {
    expect(
      defaultDirectiveFormatter.serialize({
        type: "file",
        label: "[id].tsx",
        id: "src/pages/[id].tsx",
      }),
    ).toBe(':file{label="[id].tsx" name="src/pages/[id].tsx"}');
    expect(
      defaultDirectiveFormatter.serialize({
        type: "file",
        label: "[id].tsx",
        id: "[id].tsx",
      }),
    ).toBe(':file{label="[id].tsx"}');
    expect(
      defaultDirectiveFormatter.serialize({
        type: "file",
        label: "{id}.tsx",
        id: "{id}.tsx",
      }),
    ).toBe(":file[{id}.tsx]");
  });

  it("parses quoted and ordinary mentions together without changing surrounding text", () => {
    expect(
      defaultDirectiveFormatter.parse(
        'Compare :file{label="[id].tsx" name="src/[id].tsx"} with :tool[Search]{name=search}.',
      ),
    ).toEqual([
      { kind: "text", text: "Compare " },
      { kind: "mention", type: "file", label: "[id].tsx", id: "src/[id].tsx" },
      { kind: "text", text: " with " },
      { kind: "mention", type: "tool", label: "Search", id: "search" },
      { kind: "text", text: "." },
    ]);
  });

  it.each([
    String.raw`:file{label="bad\q]"}`,
    String.raw`:file{label="bad\uZZZZ]"}`,
    ':file{label="unterminated]}',
    ':file{label="[id]" name="unterminated}',
    ':file{label="a\t]"}',
    `:file{label="${"]".repeat(1025)}"}`,
  ])("leaves malformed quoted syntax as text: %s", (text) => {
    expect(defaultDirectiveFormatter.parse(text)).toEqual([
      { kind: "text", text },
    ]);
  });
});
