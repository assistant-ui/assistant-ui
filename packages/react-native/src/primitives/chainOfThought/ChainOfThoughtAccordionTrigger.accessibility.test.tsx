import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { Text } from "react-native";
import { AuiProvider, useAui, useAuiState } from "@assistant-ui/store";
import { ChainOfThoughtClient } from "@assistant-ui/core/store";
import { ChainOfThoughtAccordionTrigger } from "./ChainOfThoughtAccordionTrigger";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const State = () => {
  const collapsed = useAuiState((s) => s.chainOfThought.collapsed);
  return <Text testID="collapsed">{String(collapsed)}</Text>;
};

const App = () => {
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
      <ChainOfThoughtAccordionTrigger testID="trigger">
        <Text>Thinking</Text>
      </ChainOfThoughtAccordionTrigger>
      <State />
    </AuiProvider>
  );
};

it("exposes expansion through the native pressable", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<App />));
    const button = container.querySelector<HTMLElement>(
      '[data-testid="trigger"]',
    )!;
    const state = container.querySelector('[data-testid="collapsed"]')!;
    expect(state.textContent).toBe("true");
    const expanded = [button.getAttribute("aria-expanded")];
    await act(async () => button.click());
    expect(state.textContent).toBe("false");
    expanded.push(button.getAttribute("aria-expanded"));
    await act(async () => button.click());
    expect(state.textContent).toBe("true");
    expanded.push(button.getAttribute("aria-expanded"));
    expect(expanded).toEqual(["false", "true", "false"]);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
