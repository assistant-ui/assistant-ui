# @assistant-ui/docs

The assistant-ui theme for Farming Labs Docs on Next.js. It includes the header,
sidebar, search button, light/dark appearance, table of contents, page actions,
and previous/next navigation. Page actions sit alongside the title; bottom
navigation stays at the bottom of short pages and follows longer content.

Site content, repository links, fonts, and legal footer remain in the consuming
app. Harness SDK consumes a packed archive from this package in its own repository.
The private website in `apps/docs` is named `@assistant-ui/docs-site`.

## Install

This package is not yet published. In this workspace, use
`"@assistant-ui/docs": "workspace:*"` and run:

```sh
pnpm install
pnpm --filter @assistant-ui/docs build
pnpm --filter @assistant-ui/docs pack
```

To use it in another repository before publishing, run `pnpm pack` in this
package and install the resulting `.tgz` with `pnpm add /path/to/package.tgz`.
Once published, the same package can be installed with `pnpm add @assistant-ui/docs`.

Use Farming Labs Docs, Next, and Theme 0.2.122 with Fumadocs UI 16.17.1.
Fumadocs UI is pinned to the framework's version: its tree, search, and TOC
providers and this theme's consumers must resolve to the same React context
instance. A separately resolved patch version can break rendering and search.
Update these packages together and run the full layout render test when changing
the pin. The framework owns
MDX rendering, content discovery, search, Markdown routes, and MCP endpoints;
this package supplies the appearance and navigation components.

## Configure a site

```tsx
// docs.config.tsx
import { defineDocs } from "@farming-labs/docs";
import { assistantUi, DocsBrand } from "@assistant-ui/docs";

export default defineDocs({
  entry: "docs",
  theme: assistantUi(),
  nav: { title: <DocsBrand name="my-project" />, url: "/docs" },
  github: {
    url: "https://github.com/my-org/my-project",
    branch: "main",
    directory: "apps/docs",
  },
  metadata: { titleTemplate: "%s – My project" },
  mcp: true,
});
```

`createDocsLayout` applies the assistant-ui layout defaults and hides the
framework's duplicate page actions. It defaults to a flat sidebar without a
collapse control. Keep `defineDocs` imported from Farming Labs so its build-time
config discovery continues to work. Existing ordering, metadata, search, and
content options are accepted.
Supply any React node as `nav.title` to use your own branding, or use
`<DocsBrand />` for assistant-ui without a product suffix.

```tsx
// app/docs/layout.tsx
import { createDocsLayout, createDocsMetadata } from "@assistant-ui/docs/next";
import config from "../../docs.config";

export const metadata = createDocsMetadata(config);

export default createDocsLayout(config, {
  name: "My project",
  homeUrl: "/",
  links: [
    { label: "GitHub", href: "https://github.com/my-org/my-project", external: true },
  ],
  mcpUrl: "/api/docs/mcp",
  footer: <span>© My project</span>,
});
```

Use `brand` for interactive header content such as a project switcher.
For a multilingual site, pass `locale` from the site's locale selection to
`createDocsLayout`. This selects the framework's localized content tree and
preserves locale parameters in header, pagination, and Markdown links.
Use `layoutProps` to provide a custom Fumadocs `tree`, navigation `slots`, or
sidebar options. Wrap a persistent sidebar banner in an element with
`data-docs-sidebar-banner` to keep it visible on desktop.

Both `mcpUrl` and `footer` are optional. The MCP action is omitted when no URL is
provided. Repository edit links use `github` and the App Router MDX file path;
for other content locations, pass an `editUrl` template to `createDocsLayout`,
such as `https://github.com/my-org/my-project/edit/main/src/app{path}/page.mdx`.
`{path}` is the current page URL path.

```tsx
// app/layout.tsx
import { RootProvider } from "@assistant-ui/docs/provider";
import "./global.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><RootProvider>{children}</RootProvider></body>
    </html>
  );
}
```

```css
/* app/global.css — replaces the direct Farming Labs theme CSS import */
@import "tailwindcss";
@import "@assistant-ui/docs/styles.css";
```

Keep the framework's `withDocs` Next configuration and API routes. Set up
Tailwind/PostCSS as in a normal Farming Labs Docs app. Import the theme stylesheet
once, after Tailwind. For the matching typography, load Public Sans and JetBrains
Mono in the host app with the CSS variables `--font-public-sans` and
`--font-jetbrains-mono`; system fonts are used when those are absent.

For theme token overrides, pass `theme: assistantUi({ ui: { ... } })` to
`defineDocs`. Additional visual overrides can follow the CSS import and target
the `aui-docs-*` classes. The theme doesn't import app aliases, MDX content, or
Harness-specific URLs.

## Development

```sh
pnpm --filter @assistant-ui/docs typecheck
pnpm --filter @assistant-ui/docs test
pnpm --filter @assistant-ui/docs build
```

Rebuild after changing package components; consumers import the compiled `dist`
exports. The `next` export stays on the server, while the header and page controls preserve their React client boundaries.
Import `provider` from the server root layout; it re-exports the framework's
client provider without pulling server-only framework exports into the browser.

The package stays private until its first registry release is configured. Packing
and installing the archive works without publishing or linking the repositories.
