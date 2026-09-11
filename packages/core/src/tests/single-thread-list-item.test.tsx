// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import type { FC } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { ExternalThread } from "../store/clients/external-thread";
import { SingleThreadList } from "../store/clients/single-thread-list";

let aui!: ReturnType<typeof useAui>;

const Capture: FC = () => {
  aui = useAui();
  return null;
};

const App: FC = () => {
  const value = useAui({
    threads: SingleThreadList({ thread: ExternalThread({ messages: [] }) }),
  });
  return (
    <AuiProvider value={value}>
      <Capture />
    </AuiProvider>
  );
};

afterEach(() => {
  cleanup();
});

describe("SingleThreadList item selectors", () => {
  it("resolves index selectors within the regular subset only", () => {
    render(<App />);

    const mainId = aui.threads.item("main").getState().id;
    expect(aui.threads.item({ index: 0 }).getState().id).toBe(mainId);
    expect(aui.threads.item({ index: 0, archived: false }).getState().id).toBe(
      mainId,
    );

    expect(aui.threads.getState().archivedThreadIds).toEqual([]);
    expect(() => aui.threads.item({ index: 0, archived: true })).toThrow(
      "unknown item selector",
    );
  });
});
