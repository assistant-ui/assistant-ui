import type { Tool } from "assistant-stream";
import type { Unsubscribe } from "../../..";
import type { ToolCallMessagePartComponent } from "../MessagePartComponentTypes";

/**
 * Schema type matching Tool["parameters"] from assistant-stream.
 * Accepts both StandardSchemaV1 and JSONSchema7.
 */
export type Unstable_InteractableStateSchema = NonNullable<
  Extract<Tool, { parameters: unknown }>["parameters"]
>;

type InteractableScope = "app" | "thread";

export type Unstable_InteractableDefinition = {
  id: string;
  name: string;
  description: string;
  stateSchema: Unstable_InteractableStateSchema;
  state: unknown;
  initialState: unknown;
  scope?: InteractableScope | undefined;
};

export type Unstable_InteractableRegistration = {
  id: string;
  name: string;
  description: string;
  stateSchema: Unstable_InteractableStateSchema;
  initialState: unknown;
  /**
   * Component installed as the tool UI for this interactable's `update_{name}`
   * tool calls, so a model edit re-renders the interactable at the message
   * that made it. Registered once per name; requires the `tools` scope.
   */
  updateRender?: ToolCallMessagePartComponent | undefined;
};

export type Unstable_InteractablePersistenceStatus = {
  isPending: boolean;
  error: unknown;
};

export type Unstable_InteractablesState = {
  /** Keyed by instance id */
  definitions: Record<string, Unstable_InteractableDefinition>;
  /** Per-id persistence sync status */
  persistence: Record<string, Unstable_InteractablePersistenceStatus>;
};

export type Unstable_InteractablePersistedState = Record<
  string,
  { name: string; state: unknown }
>;

export type Unstable_InteractablePersistenceAdapter = {
  save(state: Unstable_InteractablePersistedState): void | Promise<void>;
  /**
   * Restores previously saved state. Called when the adapter is attached;
   * loaded state seeds app-scoped interactables that have not been locally
   * edited yet (a local edit always wins over a slow load).
   */
  load?():
    | Unstable_InteractablePersistedState
    | null
    | undefined
    | Promise<Unstable_InteractablePersistedState | null | undefined>;
};

export type Unstable_InteractablesConfig = {
  persistence?: Unstable_InteractablePersistenceAdapter | undefined;
};

export type Unstable_InteractablesMethods = {
  getState(): Unstable_InteractablesState;
  register(def: Unstable_InteractableRegistration): Unsubscribe;
  setState(id: string, updater: (prev: unknown) => unknown): void;
  exportState(): Unstable_InteractablePersistedState;
  importState(saved: Unstable_InteractablePersistedState): void;
  setPersistenceAdapter(
    adapter: Unstable_InteractablePersistenceAdapter | undefined,
  ): void;
  flush(): Promise<void>;
};

export type Unstable_InteractablesClientSchema = {
  methods: Unstable_InteractablesMethods;
};
