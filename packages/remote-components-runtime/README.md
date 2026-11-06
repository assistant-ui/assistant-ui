# `@assistant-ui/remote-components-runtime`

`rc-runtime.js`: the script that makes any HTML document a remote component (`window.rc`). No framework, no options.

```html
<script src="/rc-runtime.js"></script>
<script>
  rc.addEventListener("props-changed", () => render(rc.props));
</script>
```

- `./rc-runtime.js`: the classic script pages load first in `<head>` (its chunks sit next to it in `dist/script/`).
- `./source`: the full build as a string, for hosts that inline it.
- `./global`: types the global `rc` (`/// <reference types="@assistant-ui/remote-components-runtime/global" />`).

Docs: https://www.assistant-ui.com/remote-components/docs/page-api
