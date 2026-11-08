---
"@assistant-ui/react-mcp": patch
---

fix: order clearing a removed server's OAuth state against providers built while the clear runs, so they cannot write the cleared credentials back or lose a save to the clear
