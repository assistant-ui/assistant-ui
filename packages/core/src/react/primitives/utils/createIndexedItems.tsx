import { type ComponentType, type FC, type ReactNode, useMemo } from "react";
import {
  type AssistantClient,
  RenderChildrenWithAccessor,
} from "@assistant-ui/store";

/**
 * `getValue` receives the accessor rather than the item so a call site can hand
 * `children` a getter. Touching that getter is what marks the item as accessed,
 * which is how `useGetItemAccessor` decides to subscribe to its updates.
 */
export const createIndexedItems = <TItem, TValue>({
  useLength,
  Provider,
  getItemState,
  getValue,
}: {
  useLength: () => number;
  Provider: ComponentType<{ index: number; children: ReactNode }>;
  getItemState: (aui: AssistantClient, index: number) => TItem;
  getValue: (getItem: () => TItem) => TValue;
}): FC<{ children: (value: TValue) => ReactNode }> => {
  const IndexedItems: FC<{ children: (value: TValue) => ReactNode }> = ({
    children,
  }) => {
    const length = useLength();

    return useMemo(
      () =>
        Array.from({ length }, (_, index) => (
          <Provider key={index} index={index}>
            <RenderChildrenWithAccessor
              getItemState={(aui) => getItemState(aui, index)}
            >
              {(getItem) => children(getValue(getItem))}
            </RenderChildrenWithAccessor>
          </Provider>
        )),
      [length, children],
    );
  };

  return IndexedItems;
};
