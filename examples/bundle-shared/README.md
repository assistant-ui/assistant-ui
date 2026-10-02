# Pre-made bundle review

The bundle catalog is disabled by default while it is under review. Set
`NEXT_PUBLIC_AUI_EXAMPLE_BUNDLES_ENABLED=1` when building or developing the docs
site to enable `/components/bundles`, the catalog banner, and
`/example-bundles/*` previews and source downloads. Leave the variable unset to
keep these surfaces unavailable. Disabled docs builds skip preview building and
packaging, and remove stale public bundle artifacts. Enabled production builds
prepare their previews automatically. Enabled development servers prepare the previews before starting Next.js.

The examples use the shared shadcn Thread and AssistantModal templates with
scripted local responses. Each source archive includes the templates used by
its preview. Agent setup and manual configuration are available on the bundle
detail pages.
