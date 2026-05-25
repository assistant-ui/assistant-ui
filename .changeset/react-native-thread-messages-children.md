---
"@assistant-ui/react-native": patch
---

fix(react-native): support the children render-prop API on `ThreadPrimitive.Messages`

`@assistant-ui/core/react`'s `ThreadPrimitive.Messages` was updated in #3642 to accept either `components` or a `children` render function, and the docs and `examples/with-expo` were switched to the children form. The React Native primitive (`FlatList`-backed, separate implementation) was missed in that pass and kept requiring `components`, so the example crashed at runtime with `Cannot read property 'UserMessage' of undefined` (from `getComponent(undefined, role, isEditing)`).

Mirrors the core/react shape: `ThreadMessagesProps` is now a union of `{ components }` or `{ children }`, with a new `ThreadMessageByChildren` that wraps each row in `MessageByIndexProvider` + `RenderChildrenWithAccessor` so consumers get a lazy `{ message }` accessor without subscribing the row to the full message state. The `components` path is unchanged.

```tsx
<ThreadPrimitive.Messages>
  {() => <MessageBubble />}
</ThreadPrimitive.Messages>
```
