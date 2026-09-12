---
"@assistant-ui/react-mcp": patch
---

fix: associate MCP add-server form labels with their controls

Validation errors are associated with the affected field alongside any existing `aria-describedby` help text.

The default `AuthFields` output now wraps its label and input in a `div`. Custom styles using direct-child input selectors need to target descendants or `data-mcp-auth-field` instead. Labels expose `data-mcp-auth-field-label` for styling.
