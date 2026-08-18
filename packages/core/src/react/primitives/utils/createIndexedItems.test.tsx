// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import type { FC, ReactNode } from "react";
import { createIndexedItems } from "./createIndexedItems";

const mockLength = vi.fn<() => number>();
const getItemStateCalls: number[] = [];
const providerIndices: number[] = [];

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    RenderChildrenWithAccessor: ({
      getItemState,
      children,
    }: {
      getItemState: (aui: unknown) => unknown;
      children: (getItem: () => unknown) => ReactNode;
    }) => children(() => getItemState({ aui: true })),
  };
});

const Provider: FC<{ index: number; children: ReactNode }> = ({
  index,
  children,
}) => {
  providerIndices.push(index);
  return <div data-index={index}>{children}</div>;
};

const Items = createIndexedItems({
  useLength: () => mockLength(),
  Provider,
  getItemState: (_aui, index) => {
    getItemStateCalls.push(index);
    return `item-${index}`;
  },
  getValue: (getItem) => ({
    get item() {
      return getItem();
    },
  }),
});

afterEach(() => {
  cleanup();
  getItemStateCalls.length = 0;
  providerIndices.length = 0;
});

describe("createIndexedItems", () => {
  it("renders one provider per index, in order", () => {
    mockLength.mockReturnValue(3);

    const { container } = render(<Items>{({ item }) => <p>{item}</p>}</Items>);

    expect(providerIndices).toEqual([0, 1, 2]);
    expect(
      [...container.querySelectorAll("p")].map((p) => p.textContent),
    ).toEqual(["item-0", "item-1", "item-2"]);
  });

  it("resolves each item from its own index", () => {
    mockLength.mockReturnValue(2);

    render(<Items>{({ item }) => <p>{item}</p>}</Items>);

    expect(getItemStateCalls).toEqual([0, 1]);
  });

  it("does not invoke the item accessor when children ignores the value", () => {
    mockLength.mockReturnValue(2);

    render(<Items>{() => <p>static</p>}</Items>);

    expect(providerIndices).toEqual([0, 1]);
    expect(getItemStateCalls).toEqual([]);
  });

  it("renders nothing when there are no items", () => {
    mockLength.mockReturnValue(0);

    const { container } = render(<Items>{({ item }) => <p>{item}</p>}</Items>);

    expect(providerIndices).toEqual([]);
    expect(container.innerHTML).toBe("");
  });
});
