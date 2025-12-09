import { tapState } from "@assistant-ui/tap";
import type { ContravariantResource } from "@assistant-ui/tap";
import { tapClientLookup } from "./tapClientLookup";
import type { ClientMethods, ClientOutputOf } from "./types/client";

const createProps = <TData>(
  key: string,
  data: TData,
  remove: () => void,
): tapClientList.ResourceProps<TData> => {
  let initialData: { data: TData } | undefined = { data };
  return {
    key,
    getInitialData: () => {
      if (!initialData) {
        throw new Error("getInitialData may only be called once");
      }
      const data = initialData.data;
      initialData = undefined;
      return data;
    },
    remove,
  };
};

export const tapClientList = <TData, TState, TMethods extends ClientMethods>(
  props: tapClientList.Props<TData, TState, TMethods>,
): {
  state: TState[];
  get: (lookup: { index: number } | { key: string }) => TMethods;
  add: (initialData: TData) => void;
} => {
  const { initialValues, getKey, resource: Resource } = props;

  type Props = tapClientList.ResourceProps<TData>;

  const [items, setItems] = tapState<Record<string, Props>>(() => {
    const entries: [string, Props][] = [];
    for (const data of initialValues) {
      const key = getKey(data);
      entries.push([
        key,
        createProps(key, data, () => {
          setItems((items) => {
            const newItems = { ...items };
            delete newItems[key];
            return newItems;
          });
        }),
      ]);
    }
    return Object.fromEntries(entries);
  });

  const lookup = tapClientLookup<TState, TMethods, Record<string, Props>>(
    items,
    Resource,
    [Resource],
  );

  const add = (data: TData) => {
    const key = getKey(data);
    setItems((items) => {
      if (key in items) {
        throw new Error(
          `Tried to add item with a key ${key} that already exists`,
        );
      }

      return {
        ...items,
        [key]: createProps(key, data, () => {
          setItems((items) => {
            const newItems = { ...items };
            delete newItems[key];
            return newItems;
          });
        }),
      };
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

  export type Props<TData, TState, TMethods extends ClientMethods> = {
    initialValues: TData[];
    getKey: (data: TData) => string;
    resource: ContravariantResource<
      ClientOutputOf<TState, TMethods>,
      ResourceProps<TData>
    >;
  };
}
