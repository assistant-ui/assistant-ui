import type { Catalog } from "generative-frame/spec";
import type { SpecComponents } from "generative-frame/spec/react";
import type { GenerativeUILibrary } from "../types";
import { defaultGenerativeUILibrary } from "../vocabulary";
import { buildSpecCatalog } from "./buildSpecCatalog";
import type { ToSpecCatalogOptions } from "./catalogDefinitions";

export type { ToSpecCatalogOptions } from "./catalogDefinitions";

/**
 * Builds generative-frame spec mode from a generative UI library: a catalog with each component's props, slots, and events, and the React implementations `SpecRenderer` and `createSpecToolkit` render it with. Value controls emit their value as the event payload, and a control whose value prop is bound with `$bindState` follows that state and writes every change back to it. An entry that declares `events` or `slots` replaces a vocabulary component's built-in events, slots, and spec description (so an override should bring its own `description`), and its component receives rendered named slots in `$slots` and a setter for each bound prop in `$bindings`.
 */
export function toSpecCatalog(
  library: GenerativeUILibrary = defaultGenerativeUILibrary,
  options: ToSpecCatalogOptions = {},
): { catalog: Catalog; components: SpecComponents } {
  return buildSpecCatalog(library, defaultGenerativeUILibrary, options);
}
