# @assistant-ui/react-lexical

## 0.0.6

### Patch Changes

- c988db8: chore: update dependencies
- Updated dependencies [f20b9ca]
- Updated dependencies [c988db8]
  - @assistant-ui/core@0.1.14
  - @assistant-ui/react@0.12.25
  - @assistant-ui/store@0.2.7

## 0.0.5

### Patch Changes

- 87e7761: feat: generalize mention system into trigger popover architecture with slash command support
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

- Updated dependencies [42bc640]
- Updated dependencies [e82726c]
- Updated dependencies [376bb00]
- Updated dependencies [87e7761]
  - @assistant-ui/core@0.1.13
  - @assistant-ui/react@0.12.24
  - @assistant-ui/store@0.2.6

## 0.0.4

### Patch Changes

- bdce66f: chore: update dependencies
- 209ae81: chore: remove aui-source export condition from package.json exports
- Updated dependencies [6554892]
- Updated dependencies [9103282]
- Updated dependencies [d726499]
- Updated dependencies [876f75d]
- Updated dependencies [bdce66f]
- Updated dependencies [c362685]
- Updated dependencies [4abb898]
- Updated dependencies [209ae81]
- Updated dependencies [50b3100]
- Updated dependencies [2dd0c9f]
- Updated dependencies [af70d7f]
  - @assistant-ui/core@0.1.10
  - @assistant-ui/react@0.12.22
  - @assistant-ui/store@0.2.6

## 0.0.3

### Patch Changes

- 52403c3: chore: update dependencies
- Updated dependencies [781f28d]
- Updated dependencies [3227e71]
- Updated dependencies [0f55ce8]
- Updated dependencies [83a15f7]
- Updated dependencies [52403c3]
- Updated dependencies [ffa3a0f]
  - @assistant-ui/core@0.1.9
  - @assistant-ui/react@0.12.21
  - @assistant-ui/store@0.2.5

## 0.0.2

### Patch Changes

- 736344c: chore: update dependencies
- ff3be2a: Add @-mention system with cursor-aware trigger detection, keyboard navigation, search, and Lexical rich editor support
- c71cb58: chore: update dependencies
- Updated dependencies [1406aed]
- Updated dependencies [9480f30]
- Updated dependencies [28a987a]
- Updated dependencies [736344c]
- Updated dependencies [ff3be2a]
- Updated dependencies [70b19f3]
- Updated dependencies [70b19f3]
- Updated dependencies [c71cb58]
  - @assistant-ui/core@0.1.8
  - @assistant-ui/react@0.12.20
  - @assistant-ui/store@0.2.4
