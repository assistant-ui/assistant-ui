// @assistant-ui/core/react/internal - Internal implementation details
// Not part of the public API. Used by @assistant-ui/react and other framework bindings.

// Composer input plugin registry. Internal because the provider is mounted by
// the package at the store's scope boundaries, never by users.
export {
  ComposerInputPluginProvider,
  useComposerInputPluginRegistry,
  useComposerInputPluginRegistryOptional,
  type ComposerActiveDescendant,
  type ComposerInputPlugin,
  type ComposerInputPluginRegisterOptions,
  type ComposerInputPluginRegistry,
} from "./primitives/composer/ComposerInputPluginContext";
