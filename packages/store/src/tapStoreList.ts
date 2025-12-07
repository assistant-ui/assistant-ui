import { tapState } from "@assistant-ui/tap";
import type { ContravariantResource } from "@assistant-ui/tap";
import { tapLookupResources } from "./tapLookupResources";
import type { ClientObject, ScopeOutputOf } from "./types";

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
export type TapStoreListConfig<TProps, TState, TClient extends ClientObject> = {
  /**
   * Initial values for the list items
   */
  initialValues: TProps[];

  /**
   * Resource function that creates an element for each item.
   * Should return a plain object with { state, client }.
   *
   * The resource will receive { initialValue, remove } as props.
   */
  resource: ContravariantResource<
    ScopeOutputOf<TState, TClient>,
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
 * Returns state array, client lookup function, and add method.
 *
 * Resources should return plain objects with { state, client }.
 * Internally uses tapLookupResources which wraps each with tapClientResource.
 *
 * @param config - Configuration object with initialValues, resource, and optional idGenerator
 * @returns Object with { state: TState[], client: (lookup) => TClient, add: (id?) => void }
 *
 * @example
 * ```typescript
 * const FooItemResource = resource(
 *   ({ initialValue, remove }): ScopeOutput<"foo"> => {
 *     const [state, setState] = tapState({ id: initialValue.id, bar: initialValue.bar });
 *     return { state, client: { updateBar, remove } };
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
 * const first = todoList.client({ index: 0 });
 * const byId = todoList.client({ id: "1" });
 *
 * // Add new item
 * todoList.add(); // Uses idGenerator
 * todoList.add("custom-id"); // Uses provided id
 * ```
 */
export const tapStoreList = <
  TProps extends { id: string },
  TState,
  TClient extends ClientObject,
>(
  config: TapStoreListConfig<TProps, TState, TClient>,
): {
  state: TState[];
  get: (lookup: { index: number } | { id: string }) => TClient;
  add: (id?: string) => void;
} => {
  const { initialValues, resource: Resource, idGenerator } = config;

  const [items, setItems] = tapState<Record<string, TProps>>(() =>
    Object.fromEntries(initialValues.map((item) => [item.id, item])),
  );

  const lookup = tapLookupResources<TState, TClient, Record<string, TProps>>(
    items,
    (item, id) =>
      Resource({
        initialValue: item,
        remove: () => {
          setItems((items) => {
            const newItems = { ...items };
            delete newItems[id];
            return newItems;
          });
        },
      }),
    [Resource],
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
    setItems((items) => ({ ...items, [newId]: newItem }));
  };

  return {
    state: lookup.state,
    get: (query: { index: number } | { id: string }) => {
      if ("index" in query) {
        return lookup.client({ index: query.index });
      }
      return lookup.client({ key: query.id });
    },
    add,
  };
};
