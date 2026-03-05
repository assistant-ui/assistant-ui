---
"assistant-ui": patch
---

Unified scaffold pipeline: both templates and examples now download from the monorepo via giget at the latest release tag. Replaced create-next-app with @clack/prompts for interactive project creation. Added grouped project picker showing templates and examples. Added --preset support with short names (e.g. --preset chatgpt). Uses the detected package manager's dlx command instead of npx for faster execution.
