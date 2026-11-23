// @vitest-environment jsdom

import { useMemo } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import type { ThreadMessage } from "../../types/message";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { createRuntimeExtras } from "./createRuntimeExtras";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";

const extras = createRuntimeExtras<{ value: number }>("useCompiledRuntime");

function useSelectedExtras() {
  const label = useMemo(() => "Value: ", []);
  const value = extras.useExtras((e) => e.value);
  return { label, value };
}

function Reader() {
  const { label, value } = useSelectedExtras();
  return (
    <output>
      {label}
      {value}
    </output>
  );
}

function App({ value }: { value: number }) {
  const runtime = useExternalStoreRuntime<ThreadMessage>({
    messages: [],
    onNew: async () => {},
    extras: extras.provide({ value }),
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Reader />
    </AssistantRuntimeProvider>
  );
}

afterEach(cleanup);

it("keeps a compiled extras hook subscribed when the provided extras change", () => {
  const view = render(<App value={1} />);
  expect(screen.getByText("Value: 1").textContent).toBe("Value: 1");

  view.rerender(<App value={2} />);
  expect(screen.getByText("Value: 2").textContent).toBe("Value: 2");
});
