# Library blocks registry
Add a block to the registry
Source for blocks authored in the library app, laid out as a
[shadcn registry](https://ui.shadcn.com/docs/registry). Nothing here is built
or published: it does not feed `apps/registry` or r.assistant-ui.com.

## Layout

```
registry/
  registry.json           every block, for shadcn (the library reads this)
  registry.ts             every block, written for apps/registry, for later
  shared/
    components/
      chat-sidebar.tsx      the conversations sidebar blocks compose
    .env.example            OPENAI_API_KEY, installed at the project root
    lib/
      runtime-provider.tsx  picks the real /api/chat runtime or the demo
      demo-runtime.tsx      scripted replies, for when there's no model key
  blocks/
    <block-name>/
      page.tsx            the route the block installs as app/<block-name>/page.tsx
      components/
        <block-name>.tsx  the block itself, installed into components/
```

This is shadcn's block layout: a block's page comes first in its `files`, with
a `target`, and its components follow without one, so they land wherever the
project's `components.json` puts components.

## Imports

A block imports assistant-ui components with the app's usual paths, such as
`@/components/assistant-ui/elements/thread.aui`, which the app's tsconfig
points at `packages/ui`. The page imports its component as
`@/registry/blocks/<block-name>/components/<block-name>`, the way shadcn's own
blocks do; the shadcn CLI rewrites that to `@/components/<block-name>` on
install. Dependencies are listed by their live registry URL.

## Shared parts

Anything more than one block uses lives in `shared/`, in `components/` or
`lib/`, and each block lists the files it needs, so installing a block brings
them along. A block composes them instead of copying them: the chat sidebar
block is `<ChatSidebar><Thread /></ChatSidebar>`, and Base passes its own logo
and header. `chat-sidebar-layout` is also its own item, to install alone.

`shared/` sits between `registry/` and `lib/` or `components/` on purpose:
shadcn rewrites `@/registry/<folder>/components/x` to `@/components/x` on
install, and needs that middle folder to do it.

## Runtimes

Every block's `page.tsx` checks for `OPENAI_API_KEY`. With it, the block talks
to the AI SDK route at `/api/chat`; without it, it plays the scripted replies
in `shared/lib/demo-runtime.tsx` (weather calls a tool, code returns a code
block, comparisons return a table, anything else reasons first), so a block
works the moment it is installed. The scripts themselves live in
`shared/lib/demo-script.ts`, which imports nothing, so web and native runtimes
share them. The shared files install into `lib/` with every block.

## Native blocks

`native-chat-thread` is a React Native block for Expo. Its `page.tsx` installs
as an Expo Router screen (`app/native-chat-thread/index.tsx`), and its
component uses only `react-native` and `@assistant-ui/react-native`, styled
with `StyleSheet`. It runs on `shared/lib/native-runtime-provider.tsx`: the
chat route in `EXPO_PUBLIC_CHAT_API` when set, the scripted demo otherwise.

The library previews native blocks through react-native-web: `next.config.ts`
aliases `react-native` to `react-native-web`, and the preview renders on the
client only.

The library's blocks page renders each block's component on the demo runtime,
in `components/library/block-previews.tsx`. The viewer's Code tab shows the
files listed in `registry.json` and what their assistant-ui dependencies add.

## Styles

`styles/<name>.css` holds each style's tokens: `assistant-ui` is the
base, and `aiellie` is laid over it. registry.json carries each style's tokens as `cssVars` and `css`, written from these files (aiellie's from both) by `node registry/styles/sync.mjs`. Edit the CSS, then run it. A style's colors should match the preset in its `meta`, such as aiellie's indigo charts. Each
item's `meta` names the shadcn preset the style sits on. The library's themes
page lists these items under assistant-ui and reads the variables for its
previews straight from the CSS files.

## Adding a block

1. Make `blocks/<block-name>/` with `page.tsx` and `components/`.
2. Add it to `registry.json` and `registry.ts`, copying `chat-thread`.
3. Add its preview to `components/library/block-previews.tsx`.

When it is time to publish, move its `registry.ts` entry into
`apps/registry/src/registry.ts`.
