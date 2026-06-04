---
"@assistant-ui/x-generative-compiler": patch
"@assistant-ui/metro": patch
---

fix: bake the compiler version into the build so the core compatibility check works when the compiler is bundled

The core/compiler compatibility check found the compiler's version by walking up from `import.meta.url` to its own `package.json`. That works when the compiler is installed as a standalone package (Next.js and Vite import it externally), but `@assistant-ui/metro` bundles the compiler into `transformer.cjs`, so at runtime there is no separate `@assistant-ui/x-generative-compiler` on disk to walk up to. The check then threw `could not determine @assistant-ui/x-generative-compiler's package version` during Expo/Metro bundling. The version is now imported from `package.json`, so the literal is inlined at build time and survives being bundled. `@assistant-ui/metro` is bumped (it carries the compiler as a bundled devDependency, so it would not pick up the fix automatically) so its bundled transformer ships the fix.
