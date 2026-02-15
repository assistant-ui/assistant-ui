import { createResourceRoot, resource, tapState } from "@assistant-ui/tap";
import { describe, expect, it } from "vitest";
import { tapClientList } from "../tapClientList";

type ItemData = {
  id: string;
  label: string;
};

const StatefulItemResource = resource(
  (props: tapClientList.ResourceProps<ItemData>) => {
    const [item] = tapState(() => props.getInitialData());
    return {
      getState: () => item,
      remove: props.remove,
    };
  },
);

const DirectInitItemResource = resource(
  (props: tapClientList.ResourceProps<ItemData>) => {
    const item = props.getInitialData();
    return {
      getState: () => item,
      remove: props.remove,
    };
  },
);

describe("tapClientList", () => {
  it("preserves insertion order for integer-like keys", () => {
    const ListResource = resource(() =>
      tapClientList({
        initialValues: [
          { id: "2", label: "two" },
          { id: "10", label: "ten" },
          { id: "1", label: "one" },
        ],
        getKey: (item) => item.id,
        resource: StatefulItemResource,
      }),
    );

    const root = createResourceRoot();
    const sub = root.render(ListResource());
    const list = sub.getValue();

    expect(list.state.map((item) => item.id)).toEqual(["2", "10", "1"]);
    expect(list.get({ index: 0 }).getState().id).toBe("2");
    expect(list.get({ index: 1 }).getState().id).toBe("10");
    expect(list.get({ index: 2 }).getState().id).toBe("1");
  });

  it("keeps initial data available across strict-mode double render", () => {
    const ListResource = resource(() =>
      tapClientList({
        initialValues: [{ id: "a", label: "alpha" }],
        getKey: (item) => item.id,
        resource: DirectInitItemResource,
      }),
    );

    const root = createResourceRoot();
    const sub = root.render(ListResource());
    const list = sub.getValue();

    expect(list.state).toEqual([{ id: "a", label: "alpha" }]);
  });
});
