# assistant-ui

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
