"use client";

// Minimal exercise of the stale-index crash class using only tap + store — no
// assistant-ui runtime. A shrink commits first (the list drops its child
// clients), then the store notifies its flat subscriber set in insertion
// order: leaves before parents. A subscriber calling flushSync re-renders the
// stale leaf alone. With render-bound aui instances the leaf reads its bound
// item instance — stale but consistent — and the parent's reconciliation
// unmounts it afterwards. The shrink must arrive from outside React's call
// stack (setTimeout, standing in for a network event), otherwise React defers
// the flush and only warns.

import { useEffect, useState, type FC } from "react";
import { flushSync } from "react-dom";
import { resource, withKey } from "@assistant-ui/tap";
import {
  AuiProvider,
  Derived,
  useAui,
  useAuiState,
  useClientLookup,
  type ClientOutput,
} from "@assistant-ui/store";

declare module "@assistant-ui/store" {
  interface ScopeRegistry {
    item: {
      methods: { getState: () => { id: string } };
      meta: { source: "itemList"; query: { index: number } };
    };
    itemList: {
      methods: {
        getState: () => { items: { id: string }[] };
        item: (lookup: { index: number }) => ClientOutput<"item">;
        clear: () => void;
      };
    };
  }
}

const ItemResource = resource(
  ({ id }: { id: string }): ClientOutput<"item"> => ({
    getState: () => ({ id }),
  }),
);

const ItemListResource = resource((): ClientOutput<"itemList"> => {
  const [ids, setIds] = useState(["a", "b", "c"]);
  const lookup = useClientLookup(
    ids.map((id) => withKey(id, ItemResource({ id }))),
  );
  return {
    getState: () => ({ items: lookup.state }),
    item: lookup.get,
    clear: () => setIds([]),
  };
});

const ItemText: FC = () => {
  const id = useAuiState((s) => s.item.id);
  reproMinimalHarness.renderLog.push(id);
  const aui = useAui();
  const [, setTick] = useState(0);
  // The flushSync subscriber (base-ui popup pattern).
  useEffect(
    () => aui.subscribe(() => flushSync(() => setTick((t) => t + 1))),
    [aui],
  );
  return (
    <p
      data-testid="item"
      className="rounded border border-gray-200 bg-white p-2 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
    >
      {id}
    </p>
  );
};

const ItemLeaf: FC<{ index: number }> = ({ index }) => {
  const aui = useAui({
    item: Derived({
      source: "itemList",
      query: { index },
      get: (aui) => aui.itemList().item({ index }),
    }),
  });
  return (
    <AuiProvider value={aui}>
      <ItemText />
    </AuiProvider>
  );
};

const ItemLeaves: FC = () => {
  const length = useAuiState((s) => s.itemList.items.length);
  return Array.from({ length }, (_, index) => (
    <ItemLeaf key={index} index={index} />
  ));
};

export const reproMinimalHarness: {
  clear: (() => void) | null;
  renderLog: string[];
} = {
  clear: null,
  renderLog: [],
};

export const ReproMinimal: FC = () => {
  const aui = useAui({ itemList: ItemListResource() });
  reproMinimalHarness.clear = () => aui.itemList().clear();

  return (
    <AuiProvider value={aui}>
      <div className="space-y-4">
        <button
          type="button"
          data-testid="shrink"
          onClick={() => setTimeout(() => aui.itemList().clear(), 0)}
          className="rounded-md bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
        >
          Shrink list
        </button>
        <div className="space-y-2">
          <ItemLeaves />
        </div>
      </div>
    </AuiProvider>
  );
};
