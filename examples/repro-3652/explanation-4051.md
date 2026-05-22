# Closing #4051: root cause and what fixed it

## Summary

The crashes reported here — `tapClientLookup: Index N out of bounds (length: M)` and `MessagePartText can only be used inside text or reasoning message parts` on thread switch — were caused by **React reusing the same fiber across a parts-list reshape with a stale `index` prop**, kept alive by a structural-key choice in our message primitives. The actual throw path was already closed by **#4069** (Derived scopes re-keying on meta change), but the underlying zombie-fiber pattern remained until **#4077**, which keys part fibers by absolute index. With both PRs in, the bug class is closed.

## The mechanism, end to end

Two ingredients combined to produce the throw:

### 1. Structural keys, not part-index keys

Inside `<MessagePrimitive.GroupedParts>` (`packages/core/src/react/primitives/message/MessageGroupedParts.tsx`) the leaf was rendered as `<MessagePartChildren key={node.nodeKey} index={node.index}>`. `node.nodeKey` is a sibling-index path (`"0"`, `"1"`, `"2.0"`) built from the group tree's structure, **not the part's absolute index**.

The auto-grouped `toolGroup` / `reasoningGroup` ranges inside `<MessagePrimitive.Parts>` had the same shape: `<MessagePrimitivePartByIndex key={i} index={range.startIndex + i}>` — keyed by local position, not absolute index.

When the parts list reshaped (thread switch, big list → small list, or a different group layout), React reconciled by these structural keys: the fiber at structural slot `"0"` survived but got a different `index` prop. The same React fiber now pointed at a different part — or at no part at all if the slot was past the new list's end.

### 2. Stale Derived scope keying (fixed by #4069)

`<PartByIndexProvider>` wraps children in:

```ts
useAui({
  part: Derived({
    source: "message",
    query: { type: "index", index },
    get: (aui) => aui.message().part({ index }),
  }),
});
```

When the parent's `index` prop flips on a reused fiber, the Derived's `query` changes. Before #4069, `Derived` accessors were resolved through a `tapEffectEvent`-wrapped meta lookup that updated **one commit late**. So on the render where `index` flipped from `15` to (e.g.) `3`, the underlying accessor was still resolving against `index = 15`. If the new message had only 4 parts, `oldAccessor.lookup(15)` blew through the bounds check in `tapClientLookup` and threw.

After #4069 (`fix(store): key Derived scopes by meta`), changing `query: { index: ... }` re-keys the Derived scope synchronously in the same render pass. The accessor lookup now resolves against the current index, so the throw doesn't fire. **This is what closed the actual error path for the affected users.**

### 3. The remaining smell, fixed by #4077

Even with #4069, the structural-key choice still meant React was *reusing fibers across part identity changes*, which is fragile by construction — any other consumer reading state by `index` could have hit the same race. #4077 changes the leaf key to the absolute part index, so React **unmounts the fiber** when the part underneath actually changes. No zombie, no race window.

## Why we couldn't reproduce locally

I tried clones of @Seluj78's MRE and several synthetic thread-switch loops; the throw didn't fire against current `main`. That's consistent with #4069 already covering the throw path — once the Derived scope re-keys synchronously, the reused fiber's read resolves correctly against the new index, even when the new index is in-range for the new message. The throw only fired in the small window before #4069 where the meta read lagged a commit, **and** the new index was out of range for the old accessor.

@AlexChim1231's `key={mainThreadId}` workaround was effectively pre-empting React's reuse of any fiber across a thread switch, achieving the same result as #4077 at the consumer level.

## What landed

- **#4069** — `fix(store): key Derived scopes by meta so consumers see new client in the same render pass`. Closes the actual throw path.
- **#4073** — `fix(react|useSmooth): render-phase resync of displayed text on part change`. Separate, surfaced during this investigation: `useSmooth` was buffering displayed text in React state and only resyncing inside a post-commit effect, leaving one frame of stale text on a surviving `MessagePartPrimitive.Text` fiber after a thread switch. No thrown error, but the same family of cross-thread state staleness.
- **#4077** — `fix(core|MessageParts,GroupedParts): key part fibers by absolute part index`. Structural defense — removes the zombie-fiber pattern that made the throw possible in the first place.

Closing this issue now. If anyone still sees the crash against `@assistant-ui/core@<post-#4077>` + `@assistant-ui/store@<post-#4069>`, please reopen with a fresh MRE — that would indicate a different mechanism than the one we just closed.

Thanks @Seluj78 and @AlexChim1231 for the careful repros and patience.
