// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import type { FC, ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { ExternalThread } from "../store/clients/external-thread";
import { SingleThreadList } from "../store/clients/single-thread-list";

let childAui!: ReturnType<typeof useAui>;

const CaptureChild: FC = () => {
  childAui = useAui();
  return null;
};

const Child: FC = () => {
  const aui = useAui({ thread: ExternalThread({ messages: [] }) });
  return (
    <AuiProvider value={aui}>
      <CaptureChild />
    </AuiProvider>
  );
};

const Parent: FC<{ children: ReactNode }> = ({ children }) => {
  const aui = useAui({
    threads: SingleThreadList({ thread: ExternalThread({ messages: [] }) }),
  });
  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

afterEach(() => {
  cleanup();
});

describe("ExternalThread suggestions scope", () => {
  it("derives the scope from its own thread when standalone", () => {
    render(<Child />);

    expect(childAui.suggestions.getState()).toEqual({ suggestions: [] });
    expect(childAui.suggestions.getState()).toBe(
      childAui.thread.suggestions().getState(),
    );
  });

  it("derives the scope from its own thread when nested under a threads parent", () => {
    render(
      <Parent>
        <Child />
      </Parent>,
    );

    expect(childAui.suggestions.getState()).toEqual({ suggestions: [] });
    expect(childAui.suggestions.getState()).toBe(
      childAui.thread.suggestions().getState(),
    );
  });
});
