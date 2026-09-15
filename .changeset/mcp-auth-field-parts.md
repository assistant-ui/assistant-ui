---
"@assistant-ui/react-mcp": patch
---

fix: let custom `AuthFields` inputs bind to the MCP add-server form

`McpAddFormPrimitive.BearerTokenField` and `McpAddFormPrimitive.ScopesField` are the bound inputs the default `AuthFields` renders. render them inside `AuthFields` children, directly or with `asChild`, so a custom bearer token or OAuth scopes input reaches the submitted auth config. `BearerTokenField` gets `aria-invalid` and the error id for a missing token, as `NameField` does for a missing name.
