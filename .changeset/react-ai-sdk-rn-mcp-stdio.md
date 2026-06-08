---
"@assistant-ui/react-ai-sdk": patch
---

fix(react-ai-sdk): make the package metro-bundleable in react native / expo by serving a client-only entry under the react-native export condition

importing @assistant-ui/react-ai-sdk in an expo / react native app failed metro bundling because the root entry re-exports the server-only generativeTools / AISDKToolkit, which pull in @ai-sdk/mcp/mcp-stdio and node's child_process. react native now resolves a client-only entry that omits the server toolkit, so metro never reaches the node-only code. the node / server entry is unchanged and still exports the full api.
