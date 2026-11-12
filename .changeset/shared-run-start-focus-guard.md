---
"@assistant-ui/react": patch
"@assistant-ui/react-lexical": patch
---

react: expose `unstable_useComposerRunStartFocusGuard`, the decision `ComposerPrimitive.Input` makes on `thread.runStart`, and use it in `LexicalComposerInput` instead of a copy that resolved the thread root from the DOM. The guard reads the thread root from context, so a composer portaled outside `ThreadPrimitive.Root` now takes focus on a run start when focus sits inside its thread, matching `ComposerPrimitive.Input`.

react-lexical: raise the `@assistant-ui/react` peer floor to `^0.15.36`, the first release that exports the hook. `@assistant-ui/react` is a host-supplied peer and `onlyUpdatePeerDependentsWhenOutOfRange` is set, so the floor has to be raised by hand.
