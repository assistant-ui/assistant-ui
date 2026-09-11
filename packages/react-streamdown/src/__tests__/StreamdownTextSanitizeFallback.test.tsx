import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { TextMessagePartProvider } from "@assistant-ui/react";
import { StreamdownTextPrimitive } from "../primitives/StreamdownText";

vi.mock("streamdown", async (importOriginal) => ({
  ...(await importOriginal<typeof import("streamdown")>()),
  defaultRehypePlugins: {},
}));

afterEach(() => {
  cleanup();
});

describe("StreamdownTextPrimitive sanitize schema fallback", () => {
  it("keeps the default schema when Streamdown's plugin set is unrecognized", () => {
    const { container } = render(
      <TextMessagePartProvider
        text={"<mark>keep</mark>\n\nplain **text**"}
        isRunning={false}
      >
        <StreamdownTextPrimitive
          mode="static"
          allowedTags={{ mark: [] }}
          security={{}}
        />
      </TextMessagePartProvider>,
    );

    // A partial fallback schema would replace the default tag list rather than
    // extend it, leaving the custom tag as the only element that survives.
    expect(container.querySelector("mark")?.textContent).toBe("keep");
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });
});
