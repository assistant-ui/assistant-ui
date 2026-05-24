import type { Unsubscribe } from "../../../types/unsubscribe";
import type { ToolCatalog } from "../../../model-context/tool-catalog";

export type ToolCatalogsState = {
  readonly catalogIds: readonly string[];
};

export type ToolCatalogsMethods = {
  getState(): ToolCatalogsState;
  register(catalog: ToolCatalog): Unsubscribe;
  /** Returns the catalog by id, or `undefined` if not registered. */
  get(catalogId: string): ToolCatalog | undefined;
  /** All registered catalogs in registration order. */
  list(): readonly ToolCatalog[];
};

export type ToolCatalogsClientSchema = {
  methods: ToolCatalogsMethods;
};
