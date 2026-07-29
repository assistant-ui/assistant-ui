import { TextMessagePartProvider } from "@assistant-ui/react";
import { renderToStaticMarkup } from "react-dom/server";
import { XuluxMarkdownText } from "./XuluxMarkdownText";

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
