---
"@assistant-ui/generative-ui": patch
---

fix(generative-ui): escape model text before it reaches slack mrkdwn, so `<!channel>`, `<@user>` and `<url|label>` in model output render as plain text; caps count the escaped length and `fromSlackBlocks` decodes the entities
