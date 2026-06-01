---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-native": patch
"@assistant-ui/react-ink": patch
"@assistant-ui/react-ai-sdk": patch
---

feat: a `defineToolkit` entry may now be an already-formed `ToolDefinition` (carrying its own `type`), not only an inline definition whose `type` the compiler infers. This is what lets a factory like `new JSONGenerativeUI({ library }).present()` be used directly as a tool.

Renames the authoring types to match `defineToolkit`: `ToolkitDeclaration` → `ToolkitDefinition`, and adds `ToolkitDefinitionEntry` (the union of an inline tool definition and a pre-formed `ToolDefinition`). The per-tool inline type is now an internal `ToolkitDefinitionInput` and is no longer exported.
