# `@assistant-ui/x-changelog`

Internal monorepo-only changesets changelog generator. **Not published to npm.**

A small fork of [`@changesets/changelog-github`](https://github.com/changesets/changesets/tree/main/packages/changelog-github) with two tweaks:

- Author credit moves from `" Thanks @user!"` before the summary to `" (@user)"` at the end of the first line, so changelog entries read more like commit messages.
- Inline `#123` issue references in changeset summaries are linkified to their GitHub issue URLs.

## How it is used

Wired into the root `.changeset/config.json`:

```jsonc
{
  "changelog": [
    "@assistant-ui/x-changelog",
    { "repo": "assistant-ui/assistant-ui" }
  ]
}
```

When `changeset version` runs, this package's `getReleaseLine` and `getDependencyReleaseLine` produce the per-package `CHANGELOG.md` entries.
