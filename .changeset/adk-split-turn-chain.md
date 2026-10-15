---
"@assistant-ui/react-google-adk": patch
---

A new turn split into one request per producing run is sent in order and stops at a failure or Stop: unsent tool replies stay held for the next turn and the typed message goes back to the composer.
