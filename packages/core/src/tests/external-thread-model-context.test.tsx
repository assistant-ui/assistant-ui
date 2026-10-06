// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import type { FC, ReactNode } from "react";
import type { Tool } from "assistant-stream";
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

const lookup = { description: "lookup", parameters: {} } as Tool<any, any>;

const expectRegisteredContext = () => {
  const unregister = childAui.modelContext.register({
    getModelContext: () => ({
      tools: { lookup },
      config: { modelName: "m" },
    }),
  });

  expect(childAui.thread.getModelContext().tools?.lookup).toBe(lookup);
  expect(childAui.thread.getModelContext().config?.modelName).toBe("m");

  unregister();
  expect(childAui.thread.getModelContext().tools?.lookup).toBeUndefined();
};

afterEach(() => {
  cleanup();
});

describe("ExternalThread model context", () => {
  it("returns registered context when standalone", () => {
    render(<Child />);
    expectRegisteredContext();
  });

  it("returns registered context when nested under a threads parent", () => {
    render(
      <Parent>
        <Child />
      </Parent>,
    );
    expectRegisteredContext();
  });
});
