/**
 * Module augmentation interface for assistant-ui store type extensions.
 *
 * Users augment this interface to register custom scopes:
 * ```typescript
 * declare module "@assistant-ui/store" {
 *   interface ScopeRegistry {
 *     myScope: { methods: { getState: () => MyState } };
 *   }
 * }
 * ```
 *
 * Augmentations are automatically forwarded to `@assistant-ui/core/store`.
 */
export interface ScopeRegistry {}
