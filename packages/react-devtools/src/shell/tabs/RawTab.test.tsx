import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RawTab } from "./RawTab";

describe("RawTab", () => {
  it("renders structured slice previews with raw JSON disclosure", () => {
    const html = renderToStaticMarkup(
      <RawTab
        apiId={1}
        data={{
          id: 1,
          state: {
            composer: {
              text: "hello",
              textLength: 5,
              role: "user",
              attachments: [],
              queue: [],
              canSend: true,
            },
            thread: {
              messages: [],
              isRunning: false,
              suggestions: [],
              capabilities: [],
            },
          },
          logs: [],
          scopes: [{ name: "thread", source: "root", methods: ["send"] }],
        }}
        clearEvents={() => {}}
        theme="light"
        selection="raw:slice:composer"
        setSelection={() => {}}
      />,
    );

    expect(html).toContain("composer");
    expect(html).toContain("5 chars");
    expect(html).toContain("Raw JSON");
    expect(html).toContain("scopes");
  });
});
