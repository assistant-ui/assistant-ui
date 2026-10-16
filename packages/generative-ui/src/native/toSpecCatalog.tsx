import type { Catalog } from "generative-frame/spec";
import type { SpecComponents } from "generative-frame/spec/react";
import { buildSpecCatalog } from "../spec/buildSpecCatalog";
import type { ToSpecCatalogOptions } from "../spec/catalogDefinitions";
import type { GenerativeUILibrary } from "../types";
import { defaultGenerativeUILibrary } from "./vocabulary";

/**
 * Builds generative-frame spec mode from a generative UI library on React Native: the same catalog as on the web, with React Native implementations for `SpecRenderer` and `createSpecToolkit`. The default library draws every vocabulary component with React Native's own components, and an entry you pass replaces or extends it as on the web.
 */
export function toSpecCatalog(
  library: GenerativeUILibrary = defaultGenerativeUILibrary,
  options: ToSpecCatalogOptions = {},
): { catalog: Catalog; components: SpecComponents } {
  return buildSpecCatalog(library, defaultGenerativeUILibrary, options, {
    positions: true,
  });
}
