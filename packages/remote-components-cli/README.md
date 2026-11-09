# `@assistant-ui/remote-components-cli`

Builds one React component (default export) into one self-contained HTML file. No config.

```sh
npx remote-components build rating.tsx   # dist/rating.html
npx remote-components build               # index.tsx → dist/index.html
npx remote-components build rating.tsx --out public/rating.html --watch
```

Docs: https://www.assistant-ui.com/remote-components/docs/cli
