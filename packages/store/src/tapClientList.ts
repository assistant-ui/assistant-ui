import { tapMemo, tapState } from "@assistant-ui/tap";
import type { ContravariantResource } from "@assistant-ui/tap";
import { tapClientLookup } from "./tapClientLookup";
import type { ClientObject, ClientOutputOf } from "./types";

export type TapClientListResourceProps<TData> = {
  key: string;
  initialData: TData | undefined;
  remove: () => void;
};

export type TapClientListProps<TData, TState, TMethods extends ClientObject> = {
  initialValues: TData[];
  getKey: (data: TData) => string;
  resource: ContravariantResource<
    ClientOutputOf<TState, TMethods>,
    TapClientListResourceProps<TData>
  >;
};

const createProps = <TData>(
  key: string,
  data: TData,
  remove: () => void,
): TapClientListResourceProps<TData> => {
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

export const tapClientList = <TData, TState, TMethods extends ClientObject>(
  props: TapClientListProps<TData, TState, TMethods>,
): {
  state: TState[];
  get: (lookup: { index: number } | { key: string }) => TMethods;
  add: (initialData: TData) => void;
} => {
  const { initialValues, getKey, resource: Resource } = props;

  type Props = TapClientListResourceProps<TData>;

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
