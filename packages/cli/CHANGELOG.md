# assistant-ui

## 0.0.107

### Patch Changes

- [#4993](https://github.com/assistant-ui/assistant-ui/pull/4993) [`6710b1b`](https://github.com/assistant-ui/assistant-ui/commit/6710b1b6227bd5e0dd0925845fe642ce811c8001) - fix: include the running CLI version in info output ([@Kinfe123](https://github.com/Kinfe123))

- [#4990](https://github.com/assistant-ui/assistant-ui/pull/4990) [`5b0b47e`](https://github.com/assistant-ui/assistant-ui/commit/5b0b47e3581a4565214c5aa36c5ced8abf024ebe) - fix: align undefined-style registry defaults with the base default and correct the shipped skill's registry commands ([@ephraimduncan](https://github.com/ephraimduncan))

- [#5021](https://github.com/assistant-ui/assistant-ui/pull/5021) [`00fea57`](https://github.com/assistant-ui/assistant-ui/commit/00fea578f66da78348bb5d0d4e0dd3853b226ec3) - fix: install registry components when scaffolding the voice and interactables examples ([@okisdev](https://github.com/okisdev))

- [#5013](https://github.com/assistant-ui/assistant-ui/pull/5013) [`fec32b1`](https://github.com/assistant-ui/assistant-ui/commit/fec32b116cf7ef3a162a3a62b5c6100a10c37642) - fix: sanitize tsconfig for every create scaffold and surface registry install failures ([@ephraimduncan](https://github.com/ephraimduncan))

- [#5042](https://github.com/assistant-ui/assistant-ui/pull/5042) [`7b13f03`](https://github.com/assistant-ui/assistant-ui/commit/7b13f0316fb2b36cd68580dd6431a96bfb9f6f04) - fix(cli): discover workspace packages from symlinked working directories ([@Kinfe123](https://github.com/Kinfe123))

- [#5041](https://github.com/assistant-ui/assistant-ui/pull/5041) [`925fd7e`](https://github.com/assistant-ui/assistant-ui/commit/925fd7e0cbe18d45ad4f85b28cd972640b187e11) - fix(cli): discover assistant-ui packages hoisted above the doctor working directory ([@Kinfe123](https://github.com/Kinfe123))

## 0.0.106

### Patch Changes

- [#4868](https://github.com/assistant-ui/assistant-ui/pull/4868) [`40b585a`](https://github.com/assistant-ui/assistant-ui/commit/40b585abd50fca94f2d5199d782dbd6c28228318) - fix: install the base ui quick start from init when the initialized project uses a base style ([@okisdev](https://github.com/okisdev))

- [#4865](https://github.com/assistant-ui/assistant-ui/pull/4865) [`c732b48`](https://github.com/assistant-ui/assistant-ui/commit/c732b48f18e60df53bc80e278d3a418c08154d18) - fix: resolve base ui flavored registry urls in add when the project style starts with base- ([@okisdev](https://github.com/okisdev))

- [#4891](https://github.com/assistant-ui/assistant-ui/pull/4891) [`732ef49`](https://github.com/assistant-ui/assistant-ui/commit/732ef4905bb454371b9ddb21d3dc75d900976373) - fix: include declared assistant-ui packages in info output ([@Kinfe123](https://github.com/Kinfe123))

- [#4891](https://github.com/assistant-ui/assistant-ui/pull/4891) [`732ef49`](https://github.com/assistant-ui/assistant-ui/commit/732ef4905bb454371b9ddb21d3dc75d900976373) - fix: validate peer dependency ranges using semver ([@Kinfe123](https://github.com/Kinfe123))

- [#4733](https://github.com/assistant-ui/assistant-ui/pull/4733) [`f1f18be`](https://github.com/assistant-ui/assistant-ui/commit/f1f18be476202178c5e6a62f041b588ee6a14887) - fix: clarify MCP install config parse errors ([@Kinfe123](https://github.com/Kinfe123))

- [#4720](https://github.com/assistant-ui/assistant-ui/pull/4720) [`d4a0b5a`](https://github.com/assistant-ui/assistant-ui/commit/d4a0b5ac56274cf0f927f62a7d788b2e0a12361c) - cli: register the `with-resumable-stream` example so `npx assistant-ui create -e with-resumable-stream` resolves instead of failing with "Unknown example". ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4844](https://github.com/assistant-ui/assistant-ui/pull/4844) [`4a55ff9`](https://github.com/assistant-ui/assistant-ui/commit/4a55ff95d1df5bbe03fa50bfebbfae0c72412698) - fix: strip every workspace path alias when materializing a template ([@okisdev](https://github.com/okisdev))

  the create flow removed monorepo tsconfig aliases by a fixed key list, so newer keys such as @/components/ui/base/* survived into scaffolded projects as dangling entries; any entry whose target points into packages/ui/ is now stripped as well.

- [#4979](https://github.com/assistant-ui/assistant-ui/pull/4979) [`4c6fc26`](https://github.com/assistant-ui/assistant-ui/commit/4c6fc26e1b90e13692f9587dc530a77e1da6eef3) - fix: accept JSONC syntax when transforming scaffold tsconfig files ([@Kinfe123](https://github.com/Kinfe123))

- [#4772](https://github.com/assistant-ui/assistant-ui/pull/4772) [`372c624`](https://github.com/assistant-ui/assistant-ui/commit/372c62489c261b7ec4dce7eadfaf0b14865289d8) - fix: clarify assistant-ui update package.json parse errors ([@Kinfe123](https://github.com/Kinfe123))

- [#4727](https://github.com/assistant-ui/assistant-ui/pull/4727) [`3e5895c`](https://github.com/assistant-ui/assistant-ui/commit/3e5895c9529411906b2c99a2db210d51417c0737) - fix(cli): doctor now detects duplicate assistant-ui packages in pnpm node_modules layouts ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4978](https://github.com/assistant-ui/assistant-ui/pull/4978) [`cfd4478`](https://github.com/assistant-ui/assistant-ui/commit/cfd44780068e783962fd160f28530b0166030508) - fix: compare prerelease versions using SemVer rules in assistant-ui doctor ([@Kinfe123](https://github.com/Kinfe123))

- [#4746](https://github.com/assistant-ui/assistant-ui/pull/4746) [`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4960](https://github.com/assistant-ui/assistant-ui/pull/4960) [`1a5b1ec`](https://github.com/assistant-ui/assistant-ui/commit/1a5b1ec6a87316f968a14f9f7b9566b324c077ae) - fix(cli): detect monorepos from the workspace root ([@Kinfe123](https://github.com/Kinfe123))

- [#4815](https://github.com/assistant-ui/assistant-ui/pull/4815) [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`0686f4e`](https://github.com/assistant-ui/assistant-ui/commit/0686f4e6b8ee5f6e17c968997ef11622ef8f9c98), [`5325f09`](https://github.com/assistant-ui/assistant-ui/commit/5325f0985768b750b050cf07f592fdfed34eccac)]:
  - @assistant-ui/agent-launcher@0.1.9

## 0.0.105

### Patch Changes

- [#4609](https://github.com/assistant-ui/assistant-ui/pull/4609) [`a50faac`](https://github.com/assistant-ui/assistant-ui/commit/a50faac5cb62f185a5e6a72cde8fbc550abf8427) - fix(cli): skip shadcn registry install when --skip-install is passed ([@okisdev](https://github.com/okisdev))

- Updated dependencies []:
  - @assistant-ui/agent-launcher@0.1.8

## 0.0.104

### Patch Changes

- [#4588](https://github.com/assistant-ui/assistant-ui/pull/4588) [`cbb5614`](https://github.com/assistant-ui/assistant-ui/commit/cbb561499f64828bb30a8cd416cb5c636cf81d3f) - chore: share CLI program construction with API surface snapshot generation ([@Yonom](https://github.com/Yonom))

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- [#4494](https://github.com/assistant-ui/assistant-ui/pull/4494) [`5e8a4e2`](https://github.com/assistant-ui/assistant-ui/commit/5e8a4e2a4c4bb4ba2aa963eb2f63da521a29bf78) - cli: rename the langgraph starter template flag to `-t langchain` so it matches the react-langchain adapter it actually scaffolds. `-t langgraph` no longer resolves; use `-t langchain` instead. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff)]:
  - @assistant-ui/agent-launcher@0.1.8

## 0.0.103

### Patch Changes

- [#4455](https://github.com/assistant-ui/assistant-ui/pull/4455) [`6dc2143`](https://github.com/assistant-ui/assistant-ui/commit/6dc214359cafcd85efcdfbbf5fe305df6f84aebe) - feat: add Eve agent runtime adapter ([@Yonom](https://github.com/Yonom))

## 0.0.102

### Patch Changes

- [#4446](https://github.com/assistant-ui/assistant-ui/pull/4446) [`25e0ede`](https://github.com/assistant-ui/assistant-ui/commit/25e0edeb152c89ac674860b5942fefb260818210) - fix: authenticate CLI GitHub downloads with configured tokens ([@ProfTrader](https://github.com/ProfTrader))

## 0.0.101

### Patch Changes

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668)]:
  - @assistant-ui/agent-launcher@0.1.7

## 0.0.100

### Patch Changes

- [#4337](https://github.com/assistant-ui/assistant-ui/pull/4337) [`e14ca8c`](https://github.com/assistant-ui/assistant-ui/commit/e14ca8c6e29d72b62146754b287dbf1ac0a19d69) - docs: teach defineToolkit instead of deprecated makeAssistantToolUI in the assistant-ui skill ([@okisdev](https://github.com/okisdev))

## 0.0.99

### Patch Changes

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc)]:
  - @assistant-ui/agent-launcher@0.1.6

## 0.0.98

### Patch Changes

- [#4228](https://github.com/assistant-ui/assistant-ui/pull/4228) [`1d21b23`](https://github.com/assistant-ui/assistant-ui/commit/1d21b23eb14ba02a9572f6be14f5c91282c0dd5e) - perf(cli): merge the two `shadcn add` calls in `create` into one ([@okisdev](https://github.com/okisdev))

  `create` for templates without local components ran `shadcn@latest add` twice (once for the shadcn UI components, once for the `@assistant-ui/*` components), paying for a separate dlx cold start, a separate registry index fetch, and a separate package-manager `add` subprocess each time. `@assistant-ui` is publicly listed in shadcn's registry index, so a single `shadcn add <shadcn components> @assistant-ui/...` resolves the whole mixed tree in one topologically sorted pass; the `tw-shimmer` CSS injection and the `components.json` registries write still happen. This roughly halves the component install time, including on the `--skip-install` path.

- Updated dependencies []:
  - @assistant-ui/agent-launcher@0.1.5

## 0.0.97

### Patch Changes

- [#4180](https://github.com/assistant-ui/assistant-ui/pull/4180) [`988f8dd`](https://github.com/assistant-ui/assistant-ui/commit/988f8dd1f9286d8b82a7dc48382f3ccf62866070) - feat: prompt to add assistant-ui agent skills when creating a project. `npx assistant-ui create` now asks whether to add the agent skills and, on yes, delegates to the `skills` CLI (`skills add assistant-ui/skills`) so it installs into your chosen agent platforms (Claude Code, Cursor, Zed, etc.). Use `--skills` / `--no-skills` to skip the prompt; non-interactive runs default to adding them. ([@okisdev](https://github.com/okisdev))

## 0.0.96

### Patch Changes

- [#4175](https://github.com/assistant-ui/assistant-ui/pull/4175) [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies []:
  - @assistant-ui/agent-launcher@0.1.5

## 0.0.95

### Patch Changes

- [#4121](https://github.com/assistant-ui/assistant-ui/pull/4121) [`7395092`](https://github.com/assistant-ui/assistant-ui/commit/73950929dbebadb275e3bdee23331f65f2635a33) - feat: detect and diagnose duplicate `@assistant-ui/core` installs ([@Yonom](https://github.com/Yonom))
  - In dev mode (`NODE_ENV !== "production"`), `@assistant-ui/core` now emits a single `console.warn` when it detects a second copy of itself loaded into the same JavaScript runtime. Mismatched transitive versions are a common source of subtle bugs (lost tool registrations, broken context lookups, failed `instanceof` checks — see issue [#4101](https://github.com/assistant-ui/assistant-ui/issues/4101)). The warning points users at `npx assistant-ui doctor`.
  - New `assistant-ui doctor` CLI command. It walks `node_modules` recursively (including nested copies), surfaces every duplicate version of any `@assistant-ui/*`, `assistant-stream` or `assistant-cloud` package, queries the npm registry for the latest versions and reports outdated installs. Use `--no-network` to skip the registry check.

## 0.0.94

### Patch Changes

- [#4115](https://github.com/assistant-ui/assistant-ui/pull/4115) [`107d6bd`](https://github.com/assistant-ui/assistant-ui/commit/107d6bd855bcb59f62c814c1a7e1ef634fafcb42) - chore(cli): drop `with-parent-id-grouping` from the `--example` list. the example demonstrated `MessagePrimitive.Unstable_PartsGroupedByParentId`, which is deprecated; its grouping pattern is now better demonstrated by `with-chain-of-thought` using `MessagePrimitive.GroupedParts`, and the sources gap is closed by emitting `source-url` parts from a `search_web` tool in the same example. `npx assistant-ui create -e with-parent-id-grouping` will no longer resolve. ([@okisdev](https://github.com/okisdev))

## 0.0.93

### Patch Changes

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154)]:
  - @assistant-ui/agent-launcher@0.1.5

## 0.0.92

### Patch Changes

- [#4044](https://github.com/assistant-ui/assistant-ui/pull/4044) [`b8fa682`](https://github.com/assistant-ui/assistant-ui/commit/b8fa6822a349cee204cb37d991d14d4fa58c7ef3) - fix: validate create scaffold selector conflicts, respect package managers in add, and refresh CLI README examples ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#4054](https://github.com/assistant-ui/assistant-ui/pull/4054) [`c1add4a`](https://github.com/assistant-ui/assistant-ui/commit/c1add4a72608a33ff47b55f1890f37dbb8d4e488) - feat: add a local source override flag `--debug-source-root` for local CLI template testing ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#4043](https://github.com/assistant-ui/assistant-ui/pull/4043) [`6123961`](https://github.com/assistant-ui/assistant-ui/commit/612396167e28eb2500c58956038a95b6cad36624) - docs: refresh assistant-ui skill examples with current model names ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#4054](https://github.com/assistant-ui/assistant-ui/pull/4054) [`c1add4a`](https://github.com/assistant-ui/assistant-ui/commit/c1add4a72608a33ff47b55f1890f37dbb8d4e488) - feat: resolve template UI components from the shared package source ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- Updated dependencies []:
  - @assistant-ui/agent-launcher@0.1.4

## 0.0.91

### Patch Changes

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies []:
  - @assistant-ui/agent-launcher@0.1.4

## 0.0.90

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#3831](https://github.com/assistant-ui/assistant-ui/pull/3831) [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063) - chore: remove decorative separator comments across packages ([@okisdev](https://github.com/okisdev))

- Updated dependencies []:
  - @assistant-ui/agent-launcher@0.1.4

## 0.0.89

### Patch Changes

- 8d334f9: fix(cli): detect package manager from npm_config_user_agent before falling back to detect-package-manager
- c988db8: chore: update dependencies
- Updated dependencies [c988db8]
  - @assistant-ui/agent-launcher@0.1.4

## 0.0.88

### Patch Changes

- 376bb00: chore: update dependencies
- Updated dependencies [376bb00]
  - @assistant-ui/agent-launcher@0.1.3

## 0.0.87

### Patch Changes

- 69eb0c5: chore: add shipables.json for CLI plugin skills
- 9103282: fix: resolve biome lint warnings (optional chaining, unused suppressions)
- bdce66f: chore: update dependencies
- 4abb898: refactor: align interactables with codebase conventions
  - Rename `useInteractable` to `useAssistantInteractable` (registration only, returns id)
  - Add `useInteractableState` hook for reading/writing interactable state
  - Remove `makeInteractable` and related types
  - Rename `UseInteractableConfig` to `AssistantInteractableProps`
  - Extract `buildInteractableModelContext` from `Interactables` resource
  - Add `with-interactables` example to CLI

- Updated dependencies [209ae81]
  - @assistant-ui/agent-launcher@0.1.2

## 0.0.86

### Patch Changes

- 52403c3: chore: update dependencies

## 0.0.85

### Patch Changes

- 6becd84: feat: add `info` command to print environment and package versions for bug reports
- c71cb58: chore: update dependencies

## 0.0.84

### Patch Changes

- 349f3c7: chore: update deps
- dbb2929: Improve CLI project creation error handling and transform sequencing in
  `assistant-ui`.
- Updated dependencies [349f3c7]
  - @assistant-ui/agent-launcher@0.1.1

## 0.0.83

### Patch Changes

- 6cdc259: feat(cli): add with-expo example to create command
- 6ef092a: feat(cli): add with-react-ink example to project scaffolding
- 848b42c: use checked-in bin wrapper to avoid pnpm install warnings in monorepos
- 1b06c09: fix(cli): detect dev script and env file from scaffolded project

## 0.0.82

### Patch Changes

- 5034b1e: Add `@assistant-ui/agent-launcher` package and `assistant-ui agent` CLI command to launch Claude Code with assistant-ui skills
- fb84e6c: Unified scaffold pipeline: both templates and examples now download from the monorepo via giget at the latest release tag. Replaced create-next-app with @clack/prompts for interactive project creation. Added grouped project picker showing templates and examples. Added --preset support with short names (e.g. --preset chatgpt). Uses the detected package manager's dlx command instead of npx for faster execution.
- Updated dependencies [5034b1e]
  - @assistant-ui/agent-launcher@0.1.0

## 0.0.81

### Patch Changes

- a845911: chore: update dependencies
- de45e19: fix(create): point the `cloud` template to the valid
  `assistant-ui-starter-cloud` repository in both CLIs and aligned tests.

## 0.0.80

### Patch Changes

- 8282dde: feat(cli): add `with-artifacts` and `with-chain-of-thought` to available examples
- 36ef3a2: chore: update dependencies

## 0.0.79

### Patch Changes

- 91df50d: feat(cli): add template picker, preset support, and new templates
- afaaf3b: fix(cli): make `init` command work in non-interactive environments
- 4068df9: Strip `@/lib/utils.ts` workspace alias during example scaffolding

## 0.0.78

### Patch Changes

- a088518: chore: update dependencies

## 0.0.77

### Patch Changes

- d45b893: chore: update dependencies

## 0.0.76

### Patch Changes

- 96cb0fe: feat: use minimal template for init command

## 0.0.75

### Patch Changes

- 605d825: chore: update dependencies

## 0.0.74

### Patch Changes

- ab66134: feat(assistant-ui): allow create new project from examples

## 0.0.73

### Minor Changes

- cfefbf0: feat(cli): add `mcp` command for installing MCP docs server

  New CLI command to easily install the assistant-ui MCP docs server for various IDEs:

  ```bash
  npx assistant-ui mcp              # Interactive prompt
  npx assistant-ui mcp --cursor     # Install for Cursor
  npx assistant-ui mcp --windsurf   # Install for Windsurf
  npx assistant-ui mcp --vscode     # Install for VSCode
  npx assistant-ui mcp --zed        # Install for Zed
  npx assistant-ui mcp --claude-code     # Install for Claude Code
  npx assistant-ui mcp --claude-desktop  # Install for Claude Desktop
  ```

  The command automatically creates or merges the appropriate MCP configuration file for each IDE.

## 0.0.72

### Patch Changes

- 3719567: chore: update deps

## 0.0.71

### Patch Changes

- 501f8c6: feat(playground): build own chat interface

## 0.0.70

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages

## 0.0.69

### Patch Changes

- e8ea57b: chore: update deps

## 0.0.68

### Patch Changes

- 01c31fe: chore: update dependencies

## 0.0.67

### Patch Changes

- ec662cd: chore: update dependencies

## 0.0.66

### Patch Changes

- 9d50ed9: refactor assistant-ui cli

## 0.0.65

### Patch Changes

- 2c33091: chore: update deps

## 0.0.64

### Patch Changes

- 2fc7e99: chore: update deps

## 0.0.63

### Patch Changes

- 953db24: chore: update deps

## 0.0.62

### Patch Changes

- chore: update deps

## 0.0.61

### Patch Changes

- e6a46e4: chore: update deps

## 0.0.60

### Patch Changes

- 8812f86: chore: update deps

## 0.0.59

### Patch Changes

- 59e27c8: feat: add new Assistant Cloud template for easy thread management and persistence
- 6649f70: feat: auto-update assistant-cloud

## 0.0.58

### Patch Changes

- 12e0a77: chore: update deps

## 0.0.57

### Patch Changes

- 0f063e0: chore: update dependencies

## 0.0.56

### Patch Changes

- 65b3ff1: chore: update deps
- 2731323: - feat: Add codemod v0-11/content-part-to-message-part for ContentPart to MessagePart migration
  - Migration automatically updates imports, types, hooks, and JSX components
  - Renames `MessagePrimitive.Content` to `MessagePrimitive.Parts`

## 0.0.55

### Patch Changes

- 644abb8: chore: update deps

## 0.0.54

### Patch Changes

- chore: update deps

## 0.0.53

### Patch Changes

- c7ea752: feat: MCP template

## 0.0.52

### Patch Changes

- 98a680e: chore: update deps

## 0.0.51

### Patch Changes

- fix: ESM without bundler compat

## 0.0.50

### Patch Changes

- fix: correctly include Typescript declarations

## 0.0.49

### Patch Changes

- 557c3f7: build: drop CJS builds

## 0.0.48

### Patch Changes

- chore: update deps

## 0.0.47

### Patch Changes

- 1ad0696: feat: assistant-ui update CLI command

## 0.0.46

### Patch Changes

- c77ef43: feat: assistant-ui update CLI command

## 0.0.45

### Patch Changes

- b9c731a: chore: update dependencies

## 0.0.44

### Patch Changes

- cli: drop version option

## 0.0.43

### Patch Changes

- 94e9f71: feat(cli): add command tailwind v4 compat

## 0.0.42

### Patch Changes

- chore: update deps

## 0.0.41

### Patch Changes

- cdca350: feat: codemods performance improvement

## 0.0.41

### Patch Changes

- feat: add migration for v0-9

## 0.0.40

### Patch Changes

- d2988ff: fix: init command does not work on empty folders
- 39aecd7: chore: update dependencies

## 0.0.39

### Patch Changes

- 1d56298: fix: make CLI's add command work w new templates

## 0.0.38

### Patch Changes

- 65a2c7c: feat: assistant-ui init CLI

## 0.0.37

### Patch Changes

- 72e66db: chore: update dependencies

## 0.0.36

### Patch Changes

- 8190d09: fix: fileURLToPath to get codemods

## 0.0.35

### Patch Changes

- 1a42993: fix: always use npx for jscodeshift

## 0.0.34

### Patch Changes

- c760cb3: fix: node 20 support

## 0.0.33

### Patch Changes

- 0a23a70: fix: node 20 support

## 0.0.32

### Patch Changes

- 6703842: feat: codemod to migrate to @assistant-ui/react-ui

## 0.0.31

### Patch Changes

- cefd975: fix: use mjs entrypoint

## 0.0.30

### Patch Changes

- f3368ad: feat: codemod for v0.8 migration

## 0.0.29

### Patch Changes

- 22272e6: chore: update dependencies

## 0.0.28

### Patch Changes

- 345f3d5: chore: update dependencies

## 0.0.27

### Patch Changes

- 4c2bf58: chore: update dependencies

## 0.0.26

### Patch Changes

- 982a6a2: chore: update dependencies

## 0.0.25

### Patch Changes

- ec3b8cc: chore: update dependencies

## 0.0.24

### Patch Changes

- 4c54273: chore: update dependencies

## 0.0.23

### Patch Changes

- 2112ce8: chore: update dependencies

## 0.0.22

### Patch Changes

- 938e734: fix: correctly pass component URLs to shadcn CLI

## 0.0.21

### Patch Changes

- 933b8c0: chore: update deps

## 0.0.20

### Patch Changes

- c59d8b5: chore: update dependencies

## 0.0.18

### Patch Changes

- 1ada091: chore: update deps

## 0.0.17

### Patch Changes

- ff5b86c: chore: update deps

## 0.0.16

### Patch Changes

- d2375cd: build: disable bundling in UI package releases

## 0.0.15

### Patch Changes

- fb32e61: chore: update deps

## 0.0.14

### Patch Changes

- fb46305: chore: update dependencies

## 0.0.13

### Patch Changes

- d8bd40b: chore: update dependencies

## 0.0.12

### Patch Changes

- c438773: feat: allow disabling ComposerInput keyboard shortcuts
- e1ae3d0: chore: update dependencies

## 0.0.11

### Patch Changes

- 155d6e7: chore: update dependencies

## 0.0.10

### Patch Changes

- c348553: chore: update dependencies

## 0.0.9

### Patch Changes

- 7faa03b: cli: create -t langgraph

## 0.0.8

### Patch Changes

- 7d7bbce: fix: create command windows compatibility

## 0.0.7

### Patch Changes

- 9a55735: chore: update deps

## 0.0.6

### Patch Changes

- ab031a0: fix: make `create` directory argument optional

## 0.0.5

### Patch Changes

- 36f3a1f: chore: update dependencies
- 1f8cc5e: refactor: make cli package more lightweight
- 3810443: feat: npx assistant-ui create
