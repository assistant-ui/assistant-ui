// Moved to @assistant-ui/core/react so the package can mount the registry at
// the store's scope boundaries (AssistantProvider, message providers).
export {
  ComposerInputPluginProvider,
  useComposerInputPluginRegistry,
  useComposerInputPluginRegistryOptional,
  type ComposerActiveDescendant,
  type ComposerInputPlugin,
  type ComposerInputPluginRegisterOptions,
  type ComposerInputPluginRegistry,
} from "@assistant-ui/core/internal";
