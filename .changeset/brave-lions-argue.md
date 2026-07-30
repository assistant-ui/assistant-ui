---
"@assistant-ui/react-mcp": patch
---

fix(react-mcp): resolve empty elicitation drafts to the unanswered state

a cleared `enum` field kept `""` as a candidate value, so the accept gate flagged it invalid with no way back to unanswered, and the gate's own required rule counted `""` as missing while the response validator counted it as present. an empty-string draft is now a field's blank state unless the schema names `""` as a legal value (an `enum` member or a `""` default), and the gate reports missing required properties from the response validator alone instead of adding a second rule.
