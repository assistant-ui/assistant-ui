---
"@assistant-ui/core": patch
"@assistant-ui/react": patch
"@assistant-ui/react-markdown": patch
"@assistant-ui/react-streamdown": patch
"@assistant-ui/react-mcp": patch
---

fix: compare arrays with indexed loops so sparse-array holes cannot read as equal; a sparse suggestions list now compacts to a dense one before it reaches the per-suggestion lookup
