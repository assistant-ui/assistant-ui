import { DerivedScope } from "../DerivedScope";
import type { AssistantScopes, ScopeInput, ScopesInput } from "../types";

/**
 * Splits a scopes object into root scopes and derived scopes.
 *
 * @param scopes - The scopes input object to split
 * @returns An object with { rootScopes, derivedScopes }
 *
 * @example
 * ```typescript
 * const scopes = {
 *   foo: RootScope({ ... }),
 *   bar: DerivedScope({ ... }),
 * };
 *
 * const { rootScopes, derivedScopes } = splitScopes(scopes);
 * // rootScopes = { foo: ... }
 * // derivedScopes = { bar: ... }
 * ```
 */
export function splitScopes(scopes: ScopesInput) {
  const rootScopes: ScopesInput = {};
  const derivedScopes: ScopesInput = {};

  for (const [key, scopeElement] of Object.entries(scopes) as [
    keyof ScopesInput,
    ScopeInput<AssistantScopes[keyof ScopesInput]>,
  ][]) {
    if (scopeElement.type === DerivedScope) {
      derivedScopes[key] = scopeElement;
    } else {
      rootScopes[key] = scopeElement;
    }
  }

  return { rootScopes, derivedScopes };
}
