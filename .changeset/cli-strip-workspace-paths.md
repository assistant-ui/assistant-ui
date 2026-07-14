---
"assistant-ui": patch
---

fix: strip every workspace path alias when materializing a template

the create flow removed monorepo tsconfig aliases by a fixed key list, so newer keys such as @/components/ui/base/* survived into scaffolded projects as dangling entries; any entry whose target points into packages/ui/ is now stripped as well.
