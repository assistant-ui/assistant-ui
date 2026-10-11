---
"@assistant-ui/react-google-adk": patch
---

fix(react-google-adk): send every answer to a group of long-running tool calls in one request once the run that made them ends, instead of letting a later answer abort an earlier one
