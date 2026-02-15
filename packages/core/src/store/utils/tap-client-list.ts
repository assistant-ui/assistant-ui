import { tapEffect, tapState, withKey } from "@assistant-ui/tap";
import type { ContravariantResource } from "@assistant-ui/tap";
import { tapClientLookup } from "./tap-client-lookup";
import type { ClientMethods } from "../types/client";

type InferClientState<TMethods> = TMethods extends {
  getState: () => infer S;
}
  ? S
  : unknown;

type DataHandle<TData> = { data: TData | undefined; hasData: boolean };
type ListItem<TData> = { key: string; handle: DataHandle<TData> };

const createProps = <TData>(
  key: string,
  data: DataHandle<TData>,
  remove: () => void,
): tapClientList.ResourceProps<TData> => {
  return {
    key,
    getInitialData: () => {
      if (!data.hasData) {
        throw new Error(
          "getInitialData may only be called during initial render",
        );
      }
      return data.data!;
    },
    remove,
  };
};

export const tapClientList = <TData, TMethods extends ClientMethods>(
  props: tapClientList.Props<TData, TMethods>,
): {
  state: InferClientState<TMethods>[];
  get: (lookup: { index: number } | { key: string }) => TMethods;
  add: (initialData: TData) => void;
} => {
  const { initialValues, getKey, resource: Resource } = props;

  const [items, setItems] = tapState<ListItem<TData>[]>(() => {
    return initialValues.map((data) => ({
      key: getKey(data),
      handle: { data, hasData: true },
    }));
  });

  const lookup = tapClientLookup<TMethods>(
    () =>
      items.map((item) =>
        withKey(
          item.key,
          Resource(
            createProps(item.key, item.handle, () => {
              setItems((items) =>
                items.filter((candidate) => candidate.key !== item.key),
              );
            }),
          ),
        ),
      ),
    [items, Resource],
  );

  tapEffect(() => {
    for (const item of items) {
      item.handle.data = undefined;
      item.handle.hasData = false;
    }
  }, [items]);

  const add = (data: TData) => {
    const key = getKey(data);
    const item: ListItem<TData> = {
      key,
      handle: { data, hasData: true },
    };

    setItems((items) => {
      if (items.some((item) => item.key === key)) {
        throw new Error(
          `Tried to add item with a key ${key} that already exists`,
        );
      }
      return [...items, item];
    });
  };

  return {
    state: lookup.state,
    get: lookup.get,
    add,
  };
};

export namespace tapClientList {
  export type ResourceProps<TData> = {
    key: string;
    getInitialData: () => TData;
    remove: () => void;
  };

  export type Props<TData, TMethods extends ClientMethods> = {
    initialValues: TData[];
    getKey: (data: TData) => string;
    resource: ContravariantResource<TMethods, ResourceProps<TData>>;
  };
}
