---
"@assistant-ui/react-pi": patch
---

fix: migrate the react-pi node host to the pi 0.80.8+ ModelRuntime API and raise the pi-coding-agent peer floor to >=0.80.8, so the ./node entry links again on pi 0.80.8+ (which removed AuthStorage and replaced ModelRegistry.create)