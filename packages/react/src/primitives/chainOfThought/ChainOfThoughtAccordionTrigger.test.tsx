// @vitest-environment jsdom
import { createRef, type MouseEvent, type Ref } from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui, useAuiState } from "@assistant-ui/store";
import { ChainOfThoughtClient } from "@assistant-ui/core/store";
import { ChainOfThoughtPrimitiveAccordionTrigger } from "./ChainOfThoughtAccordionTrigger";

afterEach(cleanup);

const Content = () => {
  const collapsed = useAuiState((s) => s.chainOfThought.collapsed);
  return (
    <div data-testid="reasoning" hidden={collapsed}>
      Reasoning details
    </div>
  );
};

const App = ({
  triggerRef,
  ...props
}: ChainOfThoughtPrimitiveAccordionTrigger.Props & {
  triggerRef?: Ref<HTMLButtonElement>;
}) => {
  const aui = useAui({
    chainOfThought: ChainOfThoughtClient({
      parts: [
        {
          type: "reasoning",
          text: "Reasoning details",
          status: { type: "complete" },
        },
      ],
      getMessagePart: () => {
        throw new Error("Part lookup is not used by the toggle");
      },
    }),
  });
  return (
    <AuiProvider value={aui}>
      <ChainOfThoughtPrimitiveAccordionTrigger {...props} ref={triggerRef} />
      <Content />
    </AuiProvider>
  );
};

describe("ChainOfThoughtPrimitiveAccordionTrigger", () => {
  it.each(["button", "render", "asChild"] as const)(
    "exposes expansion and forwards the ref with %s",
    async (mode) => {
      const ref = createRef<HTMLButtonElement>();
      const { getByRole, getByTestId } = render(
        <App
          triggerRef={ref}
          {...(mode === "render" ? { render: <button /> } : {})}
          {...(mode === "asChild" ? { asChild: true } : {})}
        >
          {mode === "asChild" ? <button>Thinking</button> : "Thinking"}
        </App>,
      );
      const button = getByRole("button", { name: "Thinking" });
      const content = getByTestId("reasoning");
      expect(ref.current).toBe(button);
      expect(content.hidden).toBe(true);
      expect(button.getAttribute("aria-expanded")).toBe("false");
      fireEvent.click(button);
      await waitFor(() => expect(content.hidden).toBe(false));
      expect(button.getAttribute("aria-expanded")).toBe("true");
      fireEvent.click(button);
      await waitFor(() => expect(content.hidden).toBe(true));
      expect(button.getAttribute("aria-expanded")).toBe("false");
    },
  );

  it("lets the caller veto expansion", () => {
    const onClick = vi.fn((event: MouseEvent) => event.preventDefault());
    const { getByRole, getByTestId } = render(
      <App onClick={onClick}>Thinking</App>,
    );
    fireEvent.click(getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
    expect(getByTestId("reasoning").hidden).toBe(true);
  });

  it("does not expand a disabled trigger", () => {
    const { getByRole, getByTestId } = render(<App disabled>Thinking</App>);
    fireEvent.click(getByRole("button"));
    expect(getByTestId("reasoning").hidden).toBe(true);
  });
});
