// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { createContext, useEffect, type PropsWithChildren } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { create, type UseBoundStore } from "zustand";
import type { ReadonlyStore } from "../../ReadonlyStore";
import { createContextHook } from "./createContextHook";
import { createContextStoreHook } from "./createContextStoreHook";

type TestState = {
  value: number;
};

type TestContextValue = {
  useTestStore: UseBoundStore<ReadonlyStore<TestState>>;
};

const TestContext = createContext<TestContextValue | null>(null);
const useTestContext = createContextHook(TestContext, "TestProvider");
const { useTestStore } = createContextStoreHook(useTestContext, "useTestStore");

const store = create<TestState>(() => ({ value: 1 }));
const selectValue = (state: TestState) => state.value;

const TestProvider = ({ children }: PropsWithChildren) => (
  <TestContext.Provider value={{ useTestStore: store }}>
    {children}
  </TestContext.Provider>
);

const Consumer = () => {
  const value = useTestStore(selectValue);

  useEffect(() => {}, [value]);

  return <div>{value}</div>;
};

describe("createContextStoreHook", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not memoize the generated zustand hook call", () => {
    const { rerender } = render(
      <TestProvider>
        <Consumer />
      </TestProvider>,
    );

    rerender(
      <TestProvider>
        <Consumer />
      </TestProvider>,
    );

    expect(screen.getByText("1")).not.toBeNull();
  });
});
