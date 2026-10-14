// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it } from "vitest";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { unstable_useInteractableState } from "../model-context/useInteractableState";
import { ExternalThread, InMemoryThreadList } from "../../store";
import { unstable_Interactables } from "./Interactables";

const Owner = () => {
  const aui = useAui();
  useEffect(
    () =>
      aui.unstable_interactables.register({
        id: "note-1",
        name: "note",
        description: "a note",
        stateSchema: { type: "object", properties: {} },
        initialState: { v: 0 },
      }),
    [aui],
  );
  return null;
};

const Reader = () => {
  const [state] = unstable_useInteractableState<{ v: number }>("note-1");
  return <output>{state?.v ?? "missing"}</output>;
};

let client: ReturnType<typeof useAui>;

const App = () => {
  const aui = useAui({
    threads: InMemoryThreadList({
      thread: () => ExternalThread({ messages: [] }),
    }),
    unstable_interactables: unstable_Interactables(),
  } as never);
  client = aui;
  return (
    <AuiProvider value={aui}>
      <Owner />
      <Reader />
    </AuiProvider>
  );
};

describe("compiled Interactables resource", () => {
  it("updates an unstable_useInteractableState reader after a state change", async () => {
    render(<App />);
    expect(screen.getByText("0").textContent).toBe("0");

    await act(async () => {
      flushTapSync(() => {
        client.unstable_interactables.setState("note-1", () => ({ v: 1 }));
      });
    });

    expect(
      client.unstable_interactables.getState().definitions["note-1"]?.state,
    ).toEqual({ v: 1 });
    expect(screen.getByText("1").textContent).toBe("1");
  });
});
