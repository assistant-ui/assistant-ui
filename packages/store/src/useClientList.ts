import { useMemo, useState } from "react";
import { withKey, type ContravariantResource } from "@assistant-ui/tap";

import { useClientLookup } from "./useClientLookup";
import type { ClientMethods } from "./types/client";

type InferClientState<TMethods> = TMethods extends {
  getState: () => infer S;
}
  ? S
  : unknown;

type DataHandle<TData> = { data: TData | undefined; hasData: boolean };

const createProps = <TData>(
  key: string,
  data: DataHandle<TData>,
  remove: () => void,
): useClientList.ResourceProps<TData> => {
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

export const useClientList = <TData, TMethods extends ClientMethods>(
  props: useClientList.Props<TData, TMethods>,
): {
  state: InferClientState<TMethods>[];
  get: (lookup: { index: number } | { key: string }) => TMethods;
  add: (initialData: TData) => void;
} => {
  const { initialValues, getKey, resource: Resource } = props;

  type Props = useClientList.ResourceProps<TData>;

  const initialDataHandles: DataHandle<TData>[] = useMemo(() => [], []);

  const [items, setItems] = useState<Record<string, Props>>(() => {
    const entries: [string, Props][] = [];
    for (const data of initialValues) {
      const key = getKey(data);
      const handle = { data, hasData: true };
      entries.push([
        key,
        createProps(key, handle, () => {
          setItems((items) => {
            const newItems = { ...items };
            delete newItems[key];
            return newItems;
          });
        }),
      ]);
      initialDataHandles.push(handle);
    }
    return Object.fromEntries(entries);
  });

  const lookup = useClientLookup<TMethods>(
    () =>
      Object.values(items).map((props) => withKey(props.key, Resource(props))),
    [items, Resource],
  );

  initialDataHandles.forEach((handle) => {
    handle.data = undefined;
    handle.hasData = false;
  });

  const add = (data: TData) => {
    const key = getKey(data);
    setItems((items) => {
      if (key in items) {
        throw new Error(
          `Tried to add item with a key ${key} that already exists`,
        );
      }

      const handle = { data, hasData: true };
      initialDataHandles.push(handle);

      return {
        ...items,
        [key]: createProps(key, handle, () => {
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

export namespace useClientList {
  export type ResourceProps<TData> = {
    key: string;
    getInitialData: () => TData;
    remove: () => void;
  };

  export type Props<TData, TMethods extends ClientMethods> = {
    initialValues: TData[];
    getKey: (data: TData) => string;
    resource: ContravariantResource<TMethods, [ResourceProps<TData>]>;
  };
}
