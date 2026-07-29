import { render, screen } from "@testing-library/react";
import { TextMessagePartProvider } from "@assistant-ui/react";
import { XuluxMarkdownText } from "./XuluxMarkdownText";

describe("XuluxMarkdownText", () => {
  it("renders a tagged course-file block through the file reference component", () => {
    render(
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

    expect(screen.getByText("app/page.tsx")).toBeInTheDocument();
    expect(
      screen.queryByText("xulux-file:course:app/page.tsx"),
    ).not.toBeInTheDocument();
  });
});
