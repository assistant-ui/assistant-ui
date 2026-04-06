---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-lexical": patch
---

feat: generalize mention system into trigger popover architecture with slash command support

- Introduce `ComposerInputPlugin` protocol to decouple ComposerInput from mention-specific code
- Extract generic `TriggerPopoverResource` from `MentionResource` supporting multiple trigger characters
- Add `Unstable_TriggerItem`, `Unstable_TriggerCategory`, `Unstable_TriggerAdapter` generic types
- Add `Unstable_SlashCommandAdapter`, `Unstable_SlashCommandItem` types
- Add `ComposerPrimitive.Unstable_TriggerPopoverRoot` and related primitives
- Add `ComposerPrimitive.Unstable_SlashCommandRoot` and related primitives
- Add `unstable_useSlashCommandAdapter` hook for building slash command adapters
- Refactor `MentionResource` as thin wrapper around `TriggerPopoverResource`
- Alias `Unstable_MentionItem`/`Unstable_MentionAdapter` to generic trigger types
- Update `react-lexical` `KeyboardPlugin` to use plugin protocol
- All existing `Unstable_Mention*` APIs remain unchanged
