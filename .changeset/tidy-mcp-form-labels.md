---
"@assistant-ui/react-mcp": patch
---

fix: associate MCP add-server form labels and validation errors with their controls

the default `AuthFields` inputs render visible `Bearer token` and `OAuth scopes` labels, and the bearer token input drops its placeholder. each label and input share a `div`, so styles that target the input as a direct child need a descendant selector or `data-mcp-auth-field`; labels expose `data-mcp-auth-field-label`.

`Error` renders with `role="alert"` and an id. the field that failed validation gets `aria-invalid` (unless the caller sets it) and that id appended to its `aria-describedby`. an `Error` with a custom `id`, including one on an `asChild` child, keeps it and is wrapped in a `div` carrying the form's error id; without a custom id, `asChild` still renders one element.

editing the field an error names clears the error. switching the auth type clears a missing bearer token error, and any edit clears the error from a failed submit.
