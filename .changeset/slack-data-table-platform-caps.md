---
"@assistant-ui/react-generative-ui": patch
---

fix: raise the Slack `data_table` caps to the current platform ceiling (200 data rows, 20,000 characters) so large tables are no longer clamped below what Slack accepts
