---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-lexical": patch
---

refactor: unify mention/slash under behavior sub-primitives; delete Mention/SlashCommand aliases and the `execute` field on `Unstable_TriggerItem`; split TriggerPopoverResource; rename react-lexical `MentionNode`/`MentionPlugin`/`MentionChipProvider`/`mentionChip` prop to `DirectiveNode`/`DirectivePlugin`/`DirectiveChipProvider`/`directiveChip`; fix IME/Unicode/copy-paste/undo bugs. Breaking (`Unstable_` APIs): replace `onSelect={{type:"insertDirective",formatter}}` with `<Unstable_TriggerPopover.Directive formatter={...}>`; replace `onSelect={{type:"action",handler}}` with `<Unstable_TriggerPopover.Action onExecute={...}>`. Rename `unstable_useToolMentionAdapter` → `unstable_useMentionAdapter` with new `items`/`categories`/`includeModelContextTools` options. `unstable_useSlashCommandAdapter` now returns `{ adapter, action }` — `execute` stays in the hook closure instead of on the item. Rename CSS class `aui-mention-chip` → `aui-directive-chip` and attributes `data-mention-*` → `data-directive-*`.
