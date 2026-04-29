# @assistant-ui/react-lexical

## 0.0.8

### Patch Changes

- [#3909](https://github.com/assistant-ui/assistant-ui/pull/3909) [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`549037a`](https://github.com/assistant-ui/assistant-ui/commit/549037ac77aed8736823cfb82baf9645e3364adf), [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e), [`976aec5`](https://github.com/assistant-ui/assistant-ui/commit/976aec566330bee3c607cfb356f3358eefe28ac1), [`25b97d5`](https://github.com/assistant-ui/assistant-ui/commit/25b97d5c62fb038471b06eaa784ad4b7e23ef533), [`2008fc9`](https://github.com/assistant-ui/assistant-ui/commit/2008fc9af3d6fe05604d6b08275c2e9cec099bd9), [`88fcd35`](https://github.com/assistant-ui/assistant-ui/commit/88fcd352ecffd12f124abe988cc5499f784f81d6)]:
  - @assistant-ui/core@0.1.16
  - @assistant-ui/react@0.12.27
  - @assistant-ui/store@0.2.9

## 0.0.7

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#3879](https://github.com/assistant-ui/assistant-ui/pull/3879) [`f57ba3f`](https://github.com/assistant-ui/assistant-ui/commit/f57ba3f8f25149a9bdfd4130ac1369339bccac20) - fix: lexical composer scroll overflow ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#3831](https://github.com/assistant-ui/assistant-ui/pull/3831) [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063) - chore: remove decorative separator comments across packages ([@okisdev](https://github.com/okisdev))

- [#3834](https://github.com/assistant-ui/assistant-ui/pull/3834) [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd) - refactor: unify mention/slash under behavior sub-primitives; delete Mention/SlashCommand aliases and the `execute` field on `Unstable_TriggerItem`; split TriggerPopoverResource; rename react-lexical `MentionNode`/`MentionPlugin`/`MentionChipProvider`/`mentionChip` prop to `DirectiveNode`/`DirectivePlugin`/`DirectiveChipProvider`/`directiveChip`; fix IME/Unicode/copy-paste/undo bugs. Breaking (`Unstable_` APIs): replace `onSelect={{type:"insertDirective",formatter}}` with `<Unstable_TriggerPopover.Directive formatter={...}>`; replace `onSelect={{type:"action",handler}}` with `<Unstable_TriggerPopover.Action onExecute={...}>`. Rename `unstable_useToolMentionAdapter` → `unstable_useMentionAdapter` with new `items`/`categories`/`includeModelContextTools` options. `unstable_useSlashCommandAdapter` now returns `{ adapter, action }` — `execute` stays in the hook closure instead of on the item. Rename CSS class `aui-mention-chip` → `aui-directive-chip` and attributes `data-mention-*` → `data-directive-*`. ([@okisdev](https://github.com/okisdev))

- [#3827](https://github.com/assistant-ui/assistant-ui/pull/3827) [`477fa8a`](https://github.com/assistant-ui/assistant-ui/commit/477fa8a4c94d8922f5639dac8888fc55926f36cd) - feat: unify mention and slash command primitives under `Unstable_TriggerPopover` ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`c7a274e`](https://github.com/assistant-ui/assistant-ui/commit/c7a274e968f8e081ded4c29cc37986392f04130e), [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`ca8f526`](https://github.com/assistant-ui/assistant-ui/commit/ca8f526944968036d47849a7659353765072a836), [`c56f98f`](https://github.com/assistant-ui/assistant-ui/commit/c56f98f5759e710281fc57b343b41af102914f1a), [`9aa5410`](https://github.com/assistant-ui/assistant-ui/commit/9aa54107fc76509830309bb5e2c74984408b97fe), [`974d15e`](https://github.com/assistant-ui/assistant-ui/commit/974d15e34675cc5a611f0297904f5cb2c1b3da8c), [`a1f84ae`](https://github.com/assistant-ui/assistant-ui/commit/a1f84ae7b7782be19a25369905171de997f327ac), [`4b19d42`](https://github.com/assistant-ui/assistant-ui/commit/4b19d42970cb98cee6ea69e2c26dc22763091568), [`b4fde97`](https://github.com/assistant-ui/assistant-ui/commit/b4fde97355b51ed7a35401eeed0e5f5943a51150), [`da0f598`](https://github.com/assistant-ui/assistant-ui/commit/da0f59818085c7b97d157da1260c5e20873c32c1), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063), [`20f8404`](https://github.com/assistant-ui/assistant-ui/commit/20f8404b70098e4b7cbc8df5bbb47985ac81b52c), [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd), [`477fa8a`](https://github.com/assistant-ui/assistant-ui/commit/477fa8a4c94d8922f5639dac8888fc55926f36cd)]:
  - @assistant-ui/core@0.1.15
  - @assistant-ui/react@0.12.26
  - @assistant-ui/store@0.2.8

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
