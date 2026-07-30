// @vitest-environment jsdom

import type { ReactNode } from "react";
import { useState } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resource } from "@assistant-ui/tap";
import { AuiProvider } from "../utils/react-assistant-context";
import { useAui } from "../useAui";

type AnyClient = Record<string, any>;

const useCounterClient = () => {
  const [count] = useState(0);
  return { getState: () => ({ count }) };
};
const CounterClient = resource(useCounterClient);

const OuterProvider = ({ children }: { children: ReactNode }) => {
  const aui = useAui({ thread: CounterClient() } as unknown as useAui.Props);
  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

afterEach(cleanup);

describe("AuiProvider value={null} isolation boundary", () => {
  it("hides an outer provider's scopes behind the boundary", () => {
    let aui!: AnyClient;
    const Consumer = () => {
      aui = useAui();
      return null;
    };

    render(
      <OuterProvider>
        <AuiProvider value={null}>
          <Consumer />
        </AuiProvider>
      </OuterProvider>,
    );

    expect(() => aui.thread.getState()).toThrow(
      "You are using a component or hook that requires an AuiProvider. " +
        "Wrap your component in an <AuiProvider> component.",
    );
  });

  it("clients built under the boundary do not inherit outer scopes", () => {
    let aui!: AnyClient;
    const Builder = () => {
      aui = useAui({ composer: CounterClient() } as unknown as useAui.Props);
      return null;
    };

    render(
      <OuterProvider>
        <AuiProvider value={null}>
          <Builder />
        </AuiProvider>
      </OuterProvider>,
    );

    expect(aui.composer.getState()).toEqual({ count: 0 });
    expect(() => aui.thread.getState()).toThrow();
  });
});
