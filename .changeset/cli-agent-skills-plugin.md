---
"assistant-ui": patch
---

feat: `assistant-ui agent` now opens Claude Code with the maintained skills from `assistant-ui/skills`, fetched at a pinned commit into the user cache, instead of a plugin bundled in the package. the bundled copy had drifted from the AI SDK it teaches (#7486) and leaves the package.
