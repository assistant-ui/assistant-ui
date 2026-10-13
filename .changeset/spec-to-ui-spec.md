---
"@assistant-ui/generative-ui": patch
---

feat: `specToUISpec` from the new React-free `@assistant-ui/generative-ui/spec/tree` converts a generative-frame spec into the tree the Slack and Teams converters and `generativeUIToJSX` take, so a spec mode answer can go to Slack and Teams. event bindings become `$action`, bound controls get a `name`, and an action param that reads a bound control's state becomes a `$field` reference to it.
