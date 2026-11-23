---
"@assistant-ui/react-ink": patch
"@assistant-ui/react-ink-markdown": patch
---

fix: an unterminated OSC, DCS, SOS, PM or APC sequence now ends at its line, so the text on the following lines still shows.
