---
"@assistant-ui/tap": patch
---

feat: add useTapHost, a React host that commits the resource in the passive phase without blocking paint; the returned per-render effects callback lets descendant consumers mount the commit ahead of their own effects via useEffect(effects). The React bridge hosts (useResource, useResources, useTapRoot) now also commit in useEffect instead of useLayoutEffect.
