export type {
  ActionBinding,
  Condition,
  PatchOperation,
  Spec,
  SpecElement,
} from "./spec/types";
export { emptySpec } from "./spec/types";
export {
  defineCatalog,
  type ActionDefinition,
  type Catalog,
  type CatalogDefinition,
  type ComponentDefinition,
  type PropsSchema,
} from "./spec/catalog";
export type { SpecPromptOptions } from "./spec/prompt";
export {
  createSpecStream,
  parseSpecStream,
  type CreateSpecStreamOptions,
  type SpecStream,
  type SpecStreamError,
  type SpecStreamMode,
  type SpecStreamResult,
  type SpecStreamUpdate,
} from "./spec/stream";
export { applyPatch } from "./spec/patch";
export {
  formatSpecIssues,
  validateSpec,
  type SpecIssue,
  type SpecIssueCode,
  type SpecValidation,
  type ValidateSpecOptions,
} from "./spec/validate";
export {
  createStateStore,
  type SpecStateStore,
  type StateListener,
} from "./spec/state";
export type { ActionHandler, ActionSource } from "./spec/actions";
export type {
  JsonSchema,
  JsonSchemaType,
  StandardSchemaLike,
} from "./json-schema";
