// @vitest-environment jsdom

import { StrictMode, Suspense, useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resource } from "@assistant-ui/tap";
import { useClientList } from "../useClientList";

type ItemData = { id: string; label: string };

const ItemResource = resource(
  ({ key, getInitialData, remove }: useClientList.ResourceProps<ItemData>) => {
    const [data, setData] = useState(getInitialData);
    return {
      getState: () => ({ key, label: data.label }),
      setLabel: (label: string) => setData((d) => ({ ...d, label })),
      remove,
    };
  },
);

type ListApi = ReturnType<typeof useClientList<ItemData, any>>;

const setup = (initialValues: ItemData[]) => {
  let api!: ListApi;
  const List = () => {
    api = useClientList<ItemData, any>({
      initialValues,
      getKey: (data) => data.id,
      resource: ItemResource,
    });
    return null;
  };
  const view = render(
    <StrictMode>
      <List />
    </StrictMode>,
  );
  return { getApi: () => api, view };
};

afterEach(() => {
  cleanup();
});

describe("useClientList", () => {
  it("mounts initial items under StrictMode double-rendering", () => {
    const { getApi } = setup([
      { id: "a", label: "first" },
      { id: "b", label: "second" },
    ]);

    expect(getApi().state).toEqual([
      { key: "a", label: "first" },
      { key: "b", label: "second" },
    ]);
    expect(getApi().get({ key: "b" }).getState()).toEqual({
      key: "b",
      label: "second",
    });
  });

  it("adds items whose initial data survives replayed renders", () => {
    const { getApi } = setup([{ id: "a", label: "first" }]);

    act(() => {
      getApi().add({ id: "b", label: "added" });
    });

    expect(getApi().state).toEqual([
      { key: "a", label: "first" },
      { key: "b", label: "added" },
    ]);
  });

  it("removes items via the resource's remove prop", () => {
    const { getApi } = setup([
      { id: "a", label: "first" },
      { id: "b", label: "second" },
    ]);

    act(() => {
      getApi().get({ key: "a" }).remove();
    });

    expect(getApi().state).toEqual([{ key: "b", label: "second" }]);
    expect(() => getApi().get({ key: "a" })).toThrow(/not found/);
  });

  it("replays getInitialData after a discarded render (suspended sibling)", async () => {
    let resolve!: () => void;
    let done = false;
    const promise = new Promise<void>((r) => (resolve = r)).then(() => {
      done = true;
    });
    const Suspender = () => {
      if (!done) throw promise;
      return null;
    };

    let api!: ListApi;
    const List = () => {
      api = useClientList<ItemData, any>({
        initialValues: [{ id: "a", label: "first" }],
        getKey: (data) => data.id,
        resource: ItemResource,
      });
      return null;
    };

    render(
      <Suspense fallback={null}>
        <List />
        <Suspender />
      </Suspense>,
    );

    await act(async () => {
      resolve();
      await promise;
    });

    expect(api.state).toEqual([{ key: "a", label: "first" }]);
  });

  it("rejects adding a duplicate key", () => {
    const { getApi } = setup([{ id: "a", label: "first" }]);

    expect(() =>
      act(() => {
        getApi().add({ id: "a", label: "dupe" });
      }),
    ).toThrow(/already exists/);
  });
});
