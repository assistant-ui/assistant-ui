import { afterEach, expect, it } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import { TextMessagePartProvider } from "@assistant-ui/react";
import { code } from "@streamdown/code";
import { StreamdownTextPrimitive } from "../primitives/StreamdownText";

Element.prototype.scrollTo ??= function scrollTo() {};

afterEach(cleanup);

it("renders highlighted code with the real code plugin", async () => {
  const { container } = render(
    <TextMessagePartProvider
      text={"```javascript\nconst answer = 42;\n```"}
      isRunning={false}
    >
      <StreamdownTextPrimitive mode="static" plugins={{ code }} />
    </TextMessagePartProvider>,
  );

  await waitFor(() => {
    const highlightedCode = container.querySelector("pre code");
    expect(highlightedCode?.textContent).toContain("const answer = 42;");
    expect(
      highlightedCode?.querySelector('span[style*="--sdm-c"]'),
    ).not.toBeNull();
  });
});
