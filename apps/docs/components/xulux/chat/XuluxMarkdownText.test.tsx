import { TextMessagePartProvider } from "@assistant-ui/react";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
import { XuluxMarkdownText } from "./XuluxMarkdownText";

vi.mock("@/components/xulux/chat/OpenInCard", () => ({
  OpenInSyntaxHighlighter: () => null,
}));
vi.mock("@/components/xulux/chat/XuluxAskQuestion", () => ({
  XuluxAskQuestion: () => null,
}));
vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | undefined | false>) =>
    values.filter(Boolean).join(" "),
}));
vi.mock("../learn/LearnFileReference", () => ({
  LearnInlineFileReference: ({
    reference,
  }: {
    reference: { path: string };
  }) => <span data-testid="learn-file-reference">{reference.path}</span>,
}));

describe("XuluxMarkdownText", () => {
  it("renders a tagged course-file block through the file reference component", () => {
    const html = renderToStaticMarkup(
      <TextMessagePartProvider
        text={[
          "Inspect this file:",
          "",
          "```xulux-file",
          "xulux-file:course:app/page.tsx",
          "```",
        ].join("\n")}
        isRunning={false}
      >
        <XuluxMarkdownText />
      </TextMessagePartProvider>,
    );

    expect(html).toContain("app/page.tsx");
    expect(html).not.toContain("xulux-file:course:app/page.tsx");
  });
});
