---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-lexical": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
---

feat: auto-mount the composer input plugin registry at the store's scope boundaries (`AssistantProvider` and the message providers) and generalize it with an active-descendant ARIA channel and a focus channel. New unstable exports `unstable_useComposerInputPluginRegistry` and `Unstable_ComposerInputPlugin` let composer-coupled components (like the new `welcome-suggestions` registry component) drive keyboard navigation, combobox ARIA, and focus through the composer input without wrapping any providers. Trigger popovers publish their ARIA state through the same channel; behavior is unchanged.
