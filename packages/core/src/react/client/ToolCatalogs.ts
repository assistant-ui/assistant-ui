import { resource, tapState, tapMemo, tapCallback } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import type { ToolCatalog } from "../../model-context/tool-catalog";

export const ToolCatalogs = resource((): ClientOutput<"toolCatalogs"> => {
  const [catalogs, setCatalogs] = tapState<Map<string, ToolCatalog>>(
    () => new Map(),
  );

  const state = tapMemo(
    () => ({
      catalogIds: Array.from(catalogs.keys()).sort(),
    }),
    [catalogs],
  );

  const register = tapCallback((catalog: ToolCatalog) => {
    setCatalogs((prev) => {
      if (prev.has(catalog.catalogId)) {
        throw new Error(
          `Tool catalog '${catalog.catalogId}' is already registered.`,
        );
      }
      const next = new Map(prev);
      next.set(catalog.catalogId, catalog);
      return next;
    });
    return () => {
      setCatalogs((prev) => {
        if (!prev.has(catalog.catalogId)) return prev;
        const next = new Map(prev);
        next.delete(catalog.catalogId);
        return next;
      });
    };
  }, []);

  return {
    getState: () => state,
    register,
    get: (id: string) => catalogs.get(id),
    list: () => Array.from(catalogs.values()),
  };
});
