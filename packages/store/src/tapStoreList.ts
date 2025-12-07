import { tapState } from "@assistant-ui/tap";
import type { ContravariantResource } from "@assistant-ui/tap";
import { tapLookupResources } from "./tapLookupResources";
import { ApiObject } from "./tapApiResource";

/**
 * Resource props that will be passed to each item resource
 */
export type TapStoreListResourceProps<TProps> = {
  initialValue: TProps;
  remove: () => void;
};

/**
 * Configuration for tapStoreList hook
 */
export type TapStoreListConfig<TProps, TState, TApi extends ApiObject> = {
  /**
   * Initial values for the list items
   */
  initialValues: TProps[];

  /**
   * Resource function that creates an element for each item.
   * Should return a plain object with { state, key?, api }.
   *
   * The resource will receive { initialValue, remove } as props.
   */
  resource: ContravariantResource<
    { state: TState; key?: string; api: TApi },
    TapStoreListResourceProps<TProps>
  >;

  /**
   * Optional ID generator function for new items
   * If not provided, items must include an ID when added
   */
  idGenerator?: () => string;
};

/**
 * Creates a stateful list with add functionality, rendering each item via the provided resource.
 * Returns state array, api lookup function, and add method.
 *
 * Resources should return plain objects with { state, key?, api }.
 * Internally uses tapLookupResources which wraps each with tapApiResource.
 *
 * @param config - Configuration object with initialValues, resource, and optional idGenerator
 * @returns Object with { state: TState[], api: (lookup) => TApi, add: (id?) => void }
 *
 * @example
 * ```typescript
 * const FooItemResource = resource(
 *   ({ initialValue, remove }): ScopeApi<"foo"> => {
 *     const [state, setState] = tapState({ id: initialValue.id, bar: initialValue.bar });
 *     return { state, key: initialValue.id, api: { updateBar, remove } };
 *   }
 * );
 *
 * const todoList = tapStoreList({
 *   initialValues: [
 *     { id: "1", bar: "First" },
 *     { id: "2", bar: "Second" }
 *   ],
 *   resource: FooItemResource,
 *   idGenerator: () => `foo-${Date.now()}`
 * });
 *
 * // Access state array
 * const allFoos = todoList.state;
 *
 * // Lookup specific item
 * const first = todoList.api({ index: 0 });
 * const byId = todoList.api({ id: "1" });
 *
 * // Add new item
 * todoList.add(); // Uses idGenerator
 * todoList.add("custom-id"); // Uses provided id
 * ```
 */
export const tapStoreList = <
  TProps extends { id: string },
  TState,
  TApi extends ApiObject,
>(
  config: TapStoreListConfig<TProps, TState, TApi>,
): {
  state: TState[];
  api: (lookup: { index: number } | { id: string }) => TApi;
  add: (id?: string) => void;
} => {
  const { initialValues, resource: Resource, idGenerator } = config;

  const [items, setItems] = tapState<TProps[]>(initialValues);

  const lookup = tapLookupResources(
    items.map((item) => [
      item.id,
      Resource({
        initialValue: item,
        remove: () => {
          setItems(items.filter((i) => i !== item));
        },
      }),
    ]),
  );

  const add = (id?: string) => {
    const newId = id ?? idGenerator?.();
    if (!newId) {
      throw new Error(
        "tapStoreList: Either provide an id to add() or configure an idGenerator",
      );
    }

    // Create a new item with the generated/provided id
    // This assumes TProps has an 'id' field - users will need to ensure their props type supports this
    const newItem = { id: newId } as TProps;
    setItems([...items, newItem]);
  };

  return {
    state: lookup.state,
    api: (query: { index: number } | { id: string }) => {
      if ("index" in query) {
        return lookup.api({ index: query.index });
      }
      return lookup.api({ key: query.id });
    },
    add,
  };
};
