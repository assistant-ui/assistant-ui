import { tapMemo, tapState } from "@assistant-ui/tap";
import type { ContravariantResource } from "@assistant-ui/tap";
import { tapClientLookup } from "./tapClientLookup";
import type { ClientMethods, ClientResourceOutputOf } from "./types/client";

const createProps = <TData>(
  key: string,
  data: TData,
  remove: () => void,
): tapClientList.ResourceProps<TData> => {
  let initialData: TData | undefined = data;
  return {
    key,
    get initialData() {
      const result = initialData;
      initialData = undefined;
      return result;
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

  const add = tapMemo(
    () => (data: TData) => {
      const key = getKey(data);
      setItems((items) => ({
        ...items,
        [key]: createProps(key, data, () => {
          setItems((items) => {
            const newItems = { ...items };
            delete newItems[key];
            return newItems;
          });
        }),
      }));
    },
    [getKey],
  );

  return {
    state: lookup.state,
    get: lookup.get,
    add,
  };
};

export namespace tapClientList {
  export type ResourceProps<TData> = {
    key: string;
    initialData: TData | undefined;
    remove: () => void;
  };

  export type Props<TData, TState, TMethods extends ClientMethods> = {
    initialValues: TData[];
    getKey: (data: TData) => string;
    resource: ContravariantResource<
      ClientResourceOutputOf<TState, TMethods>,
      ResourceProps<TData>
    >;
  };
}
