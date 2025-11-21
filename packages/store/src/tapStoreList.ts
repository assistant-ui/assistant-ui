import { tapState } from "@assistant-ui/tap";
import type { ContravariantResource } from "@assistant-ui/tap";
import { tapLookupResources } from "./tapLookupResources";
import { ApiObject } from "./tapApi";

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

  // TODO we can't use Resource type here because of contravariance
  // I think we need a special type in tap that correctly handles the contravariance
  // or change the behavior of the Resource type

  /**
   * Resource function that creates an element for each item
   * Should return a ResourceElement with { key, state, api }
   *
   * The resource will receive { initialValue, remove } as props.
   */
  resource: ContravariantResource<
    {
      key: string | undefined;
      state: TState;
      api: TApi;
    },
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
 * @param config - Configuration object with initialValues, resource, and optional idGenerator
 * @returns Object with { state: TState[], api: (lookup) => TApi, add: (id?) => void }
 *
 * @example
 * ```typescript
 * const todoList = tapStoreList({
 *   initialValues: [
 *     { id: "1", text: "First todo" },
 *     { id: "2", text: "Second todo" }
 *   ],
 *   resource: (props) => TodoItemResource(props, { key: props.id }),
 *   idGenerator: () => `todo-${Date.now()}`
 * });
 *
 * // Access state array
 * const allTodos = todoList.state;
 *
 * // Lookup specific item
 * const firstTodo = todoList.api({ index: 0 });
 * const specificTodo = todoList.api({ key: "1" });
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
    items.map((item) =>
      Resource(
        {
          initialValue: item,
          remove: () => {
            setItems(items.filter((i) => i !== item));
          },
        },
        {
          key: item.id,
        },
      ),
    ),
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
