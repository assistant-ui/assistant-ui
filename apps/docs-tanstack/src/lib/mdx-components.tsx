import type { MDXComponents } from "mdx/types";
import { makeStub } from "./stub-component";
// The real component map of apps/docs (Callout, Tabs, Steps, CodeBlock, ParametersTable, InstallCommand, ...).
import { getMDXComponents as getDocsMDXComponents } from "../../../docs/mdx-components";

// Names some pages use without importing them; on Next they come from the
// flavor.server import that the spike stubs.
const STUB_NAMES = ["StandaloneMode", "RuntimeMode"];

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return getDocsMDXComponents({
    ...Object.fromEntries(STUB_NAMES.map((n) => [n, makeStub(n)])),
    ...components,
  });
}
