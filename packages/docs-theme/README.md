# @assistant-ui/docs-theme

The assistant-ui theme for Farming Labs Docs. Like the framework's built-in
themes, it is a theme configuration plus a stylesheet for the shared docs layout,
so it works with every Farming Labs React framework (Next.js, TanStack Start,
Farm). It styles the sidebar, search button, light/dark appearance, page title,
table of contents, page actions, edit link, and previous/next navigation.

Site content, repository links, fonts, and legal footer remain in the consuming
app. Consumers install this package from npm.
The private website in `apps/docs` is named `@assistant-ui/docs-site`.

## Install

```sh
pnpm add @assistant-ui/docs-theme @farming-labs/docs@0.2.141 @farming-labs/next@0.2.141 @farming-labs/theme@0.2.141 fumadocs-core@16.17.8 fumadocs-ui@16.17.8 motion@^14
```

Use the Farming Labs Docs, Next, and Theme stable patch 0.2.141 with Fumadocs UI 16.17.8. This version provides the theme options, shared-layout page features and theme-supplied MDX components the theme relies on, and includes the focused `@farming-labs/docs/config` entry used by the theme, avoids loading the raw Markdown parser for MDX tree helpers, loads the built-in command-search dialog on first use, and defaults build-time MDX highlighting to Oniguruma.
Fumadocs UI and Fumadocs Core are required peers because the theme imports their
shared contexts and framework helpers. Package managers with automatic peer
installation install them; otherwise, add `fumadocs-ui@16.17.8` and
`fumadocs-core@16.17.8` directly and satisfy their peers. With Yarn PnP, align
Fumadocs Core's Zod 4 peer with the version resolved by `@farming-labs/theme`. PnP can create separate context instances for different
peer environments even when the Fumadocs versions match.

The Docs, Theme, Fumadocs UI, and Fumadocs Core peers use exact versions as an exception to the
repository's caret-range convention. A future framework patch may change its
Fumadocs dependency, so accepting it independently could split the tree, search,
and TOC React contexts and break rendering. Update all four pins together and
run the full layout render tests when changing them. The framework owns
MDX rendering, content discovery, search, Markdown routes, and MCP endpoints;
this package supplies the appearance and navigation components.

## Configure a site

```tsx
// docs.config.tsx
import { defineDocs } from "@farming-labs/docs/config";
import { assistantUi, DocsBrand } from "@assistant-ui/docs-theme";

export default defineDocs({
  entry: "docs",
  theme: assistantUi(),
  nav: {
    title: <DocsBrand name="my-project" />,
    url: "/docs",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "GitHub", href: "https://github.com/my-org/my-project", external: true },
    ],
  },
  github: {
    url: "https://github.com/my-org/my-project",
    branch: "main",
    directory: "apps/docs",
  },
  footer: <span>© My project</span>,
  metadata: { titleTemplate: "%s – My project" },
  mcp: true,
});
```

The theme renders the site header across the top of the page (brand,
search, `nav.links`, theme toggle), a skip link, the frontmatter title with
previous/next arrows and a "…" page actions menu (Copy page, View as Markdown,
Open in Claude or Codex, Copy MCP server URL), and Copy page, View as Markdown
and Edit on GitHub below the table of contents. It also defaults to a flat
sidebar without a collapse control and no breadcrumb. These defaults sit under
your configuration: set `pageActions`, `sidebar`, or `breadcrumb` yourself to
change any of them, for example
`pageActions: { connectMcp: { endpoint: "/api/docs/mcp" } }`.
`assistantUiDefaults` exports the same defaults for spreading into a config.

The theme also supplies the assistant-ui MDX components on React frameworks
(Next.js, TanStack Start, Farm): numbered code blocks with a title bar and copy
button, `CodeGroup` tabs, `Callout` (Markdown blockquotes render as one),
`Tabs`/`Tab`, `Steps`/`Step`, `Cards`/`Card`, `Files`/`File`/`Folder`, linkable
headings, tables, `Kbd`, `Code` and `ThemeImage`. Highlighting uses the
`catppuccin-latte` and `catppuccin-mocha` Shiki themes. Pass `components` to
replace any of them; the rest stay. `@assistant-ui/docs-theme/mdx` exports each
component and the `assistantUiMdxComponents` map. On Farm, pass the Shiki themes
to `withDocs` as `codeBlockThemes`, since its MDX compiler does not read them
from the theme.

Render the docs with your framework's own Farming Labs layout, as with any
built-in theme, and import the stylesheet once, after Tailwind:

```css
/* app/global.css — replaces the direct Farming Labs theme CSS import */
@import "tailwindcss";
@import "@assistant-ui/docs-theme/styles.css";
```

The stylesheet applies to layouts marked `data-fd-theme="assistant-ui"`, which
Farming Labs sets from the theme name, so it leaves other docs layouts in the
same app alone.

### Next.js layout

On Next.js, `createDocsLayout` remains available for existing sites. It renders
its own header, title controls, table of contents actions, skip link and footer
slot, and turns the framework's versions of them off. It defaults to a flat sidebar without a
collapse control. Keep `defineDocs` imported from Farming Labs so its build-time
config discovery continues to work. Existing ordering, metadata, search, and
content options are accepted.
Supply any React node as `nav.title` to use your own branding, or use
`<DocsBrand />` for assistant-ui without a product suffix.

```tsx
// app/docs/layout.tsx
import { createDocsLayout, createDocsMetadata } from "@assistant-ui/docs-theme/next";
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
import { RootProvider } from "@assistant-ui/docs-theme/provider";
import "./global.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body><RootProvider>{children}</RootProvider></body>
    </html>
  );
}
```

Keep the framework's `withDocs` Next configuration and API routes. Set up
Tailwind/PostCSS as in a normal Farming Labs Docs app. Import the theme stylesheet
once, after Tailwind. For the matching typography, load Public Sans and JetBrains
Mono in the host app with the CSS variables `--font-public-sans` and
`--font-jetbrains-mono`; system fonts are used when those are absent.

For theme token overrides, pass `theme: assistantUi({ ui: { ... } })` to
`defineDocs`. Additional visual overrides can follow the CSS import and target
the shared layout's `fd-*` classes, or the `aui-docs-*` classes of
`createDocsLayout`. The theme doesn't import app aliases, MDX content, or
Harness-specific URLs.

## Development

```sh
pnpm --filter @assistant-ui/docs-theme typecheck
pnpm --filter @assistant-ui/docs-theme test
pnpm --filter @assistant-ui/docs-theme build
```

Rebuild after changing package components; consumers import the compiled `dist`
exports. The `next` export stays on the server, while the header and page controls preserve their React client boundaries.
Import `provider` from the server root layout; it re-exports the framework's
client provider without pulling server-only framework exports into the browser.

In this workspace, use `"@assistant-ui/docs-theme": "workspace:*"`. To test local
changes in another repository, run `pnpm pack` in this package and install the
resulting archive with `pnpm add /path/to/package.tgz`.

## Compose the assistant-ui site layout

The `ui` entry supplies the responsive shell, header, animated sidebar sections,
page typography, table of contents, and pager used by `apps/docs`. It does not
import the framework’s layout into the browser. `apps/docs` compiles content with
`withDocs` from `@farming-labs/next/config` and selects `assistantUi()` in its
Farming Labs configuration. It retains application-owned search, platform
selection, Markdown endpoints, and navigation metadata.
The existing `next`, `provider`, and `styles.css` integration above remains available.

Use Next.js App Router, React 19, Tailwind CSS 4, and `motion@^14` for the animated
sidebar. Supply your existing semantic Tailwind tokens (`background`, `foreground`,
`muted`, `muted-foreground`, `accent`, and `border`) and fonts. Import `site.css`
instead of `styles.css`; it includes a source directive for the published component
classes, so no source alias or monorepo-relative Tailwind path is necessary.

```css
@import "tailwindcss";
@import "@assistant-ui/docs-theme/site.css";
```

```tsx
import {
  DocsBody, DocsContent, DocsPageShell, DocsShell,
  DocsSidebar, DocsSidebarProvider,
} from "@assistant-ui/docs-theme/ui";

export function Documentation({ header, navigation, toc, footer, children }: {
  header: React.ReactNode;
  navigation: React.ReactNode;
  toc: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DocsSidebarProvider>
      <DocsShell>
        {header}
        <DocsContent>
          <DocsPageShell
            toc={toc}
            footer={footer}
            mainProps={{ id: "main-content", tabIndex: -1 }}
          >
            <DocsBody>{children}</DocsBody>
          </DocsPageShell>
        </DocsContent>
        <DocsSidebar>{navigation}</DocsSidebar>
      </DocsShell>
    </DocsSidebarProvider>
  );
}
```

`DocsSiteHeader` owns the mobile navigation/sidebar toggles and responsive header
regions. Provide branding, search, theme controls, and application links through
its slots. `navigationRoot` accepts your existing navigation provider;
`mobileNavigation(close)` receives the action to close the menu and restore focus
to its toggle after navigation. `useDocsSidebar` lets a custom header control the
same sidebar; `DOCS_SIDEBAR_ID` identifies it for `aria-controls`.
`DocsPageShell.mainProps` configures the main landmark, including a focusable target
for an application-provided skip link.

`DocsSidebarNavigation` accepts `sections` (folders with stable `$id` values),
`pathname`, `activeSectionId`, and `onNavigate`. Use `isVisible` for platform-specific
nodes and `banner`/`footer` for a platform selector and social links. The structural
`DocsNode` types accept Fumadocs page trees without tying rendering to that engine.
The active ancestor path is computed once per tree/path change; opening a section
does not repeat a tree walk for each nested folder.

`DocsTableOfContents` accepts `{title, url, depth}` items and an action area as
children. `DocsPagerNavigation` accepts previous/next URLs with optional names for
accessible link labels, and an actions menu as children. `DocsFooter` accepts named previous/next destinations and optional section
labels. Copy, search, Ask AI, and analytics stay with the consuming application.

The shell, page body, and footer can render as Server Components. Interactive
components preserve their client boundaries in the published build. A separate
module graph keeps the Farming Labs integration out of the `ui` consumer bundle;
this does not remove Farming Labs’ internal Fumadocs dependencies or promise a
particular page-load time.

The table of contents observes headings only while its desktop region is visible,
and reconnects when the viewport grows.
