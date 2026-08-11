---
"@assistant-ui/react-generative-ui": patch
---

fix: report a reshaped Slack carousel card accurately. The reshape is a `fallback` rather than a `clamped`, since a card holding only text loses nothing; the images, tables, charts, and controls a reshape really does lose are reported separately as `dropped`; and the title and body are clamped through the warning path instead of being sliced silently
