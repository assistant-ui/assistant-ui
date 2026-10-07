// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { useEffect, useState, type FC } from "react";
import { describe, expect, it } from "vitest";
import { AuiProvider, useAui, useAuiState } from "@assistant-ui/store";
import { ExternalThread, InMemoryThreadList } from "../../store";
import { unstable_Interactables } from "./Interactables";

const noteReg = {
  id: "tc1",
  name: "note",
  description: "a note",
  stateSchema: { type: "object" as const, properties: {} },
  initialState: { v: 0 },
  scope: "thread" as const,
};

// Stands in for the tool-call part that renders a tool-created interactable:
// useInteractable registers it with scope "thread" inside that part.
const ThreadNote: FC = () => {
  const aui = useAui();
  useEffect(() => aui.unstable_interactables.register(noteReg as never), [aui]);
  return null;
};

const setup = () => {
  const captured: {
    aui?: ReturnType<typeof useAui>;
    setShown?: (ids: string[]) => void;
  } = {};
  const View: FC = () => {
    captured.aui = useAui();
    const [shown, setShown] = useState<string[]>(["main"]);
    captured.setShown = setShown;
    const main = useAuiState((s) => s.threads.mainThreadId);
    return shown.includes(main) ? <ThreadNote key={main} /> : null;
  };
  const App: FC = () => {
    const aui = useAui({
      threads: InMemoryThreadList({
        thread: () => ExternalThread({ messages: [] }),
      }),
      unstable_interactables: unstable_Interactables(),
    } as never);
    return (
      <AuiProvider value={aui}>
        <View />
      </AuiProvider>
    );
  };
  render(<App />);
  return {
    aui: () => captured.aui!,
    setShown: (ids: string[]) => captured.setShown!(ids),
  };
};

const noteState = (aui: ReturnType<typeof useAui>) =>
  aui.unstable_interactables.getState().definitions["tc1"]?.state;

describe("Interactables thread-scoped state across thread switches", () => {
  it("keeps an unsent edit to a tool-created interactable across switching away and back", async () => {
    const { aui } = setup();
    expect(noteState(aui())).toEqual({ v: 0 });

    await act(async () => {
      aui().unstable_interactables.setState("tc1", () => ({ v: 5 }));
    });
    expect(noteState(aui())).toEqual({ v: 5 });

    await act(async () => {
      aui().threads.switchToNewThread();
    });
    expect(aui().threads.getState().mainThreadId).not.toBe("main");
    expect(noteState(aui())).toBeUndefined();

    await act(async () => {
      aui().threads.switchToThread("main");
    });
    expect(aui().threads.getState().mainThreadId).toBe("main");

    expect(noteState(aui())).toEqual({ v: 5 });
  });

  it("does not surface a tool-created interactable's detached state in the thread switched to", async () => {
    const { aui, setShown } = setup();
    await act(async () => {
      aui().unstable_interactables.setState("tc1", () => ({ v: 5 }));
    });

    await act(async () => {
      aui().threads.switchToNewThread();
    });
    const other = aui().threads.getState().mainThreadId;
    expect(other).not.toBe("main");
    expect(noteState(aui())).toBeUndefined();

    // the other thread renders its own call with the same tool-call id
    await act(async () => {
      setShown(["main", other]);
    });
    expect(noteState(aui())).toEqual({ v: 0 });
  });
});
