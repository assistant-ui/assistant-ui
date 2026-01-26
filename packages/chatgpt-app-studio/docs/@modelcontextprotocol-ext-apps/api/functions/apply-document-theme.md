# applyDocumentTheme

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

- applyDocumentTheme(theme: [McpUiTheme](../types/app.McpUiTheme.html)): void[](#applydocumenttheme)
Apply a theme to the document root element.

Sets the `data-theme` attribute and CSS `color-scheme` property on
`document.documentElement`. This enables CSS selectors like
`[data-theme="dark"]` and ensures native elements (scrollbars, form controls)
respect the theme.

#### Parameters

theme: [McpUiTheme](../types/app.McpUiTheme.html)The theme to apply ("light" or "dark")

#### Returns void

#### Example: Apply theme from host context[](#example-apply-theme-from-host-context)

```
`// Apply when host context changes
app.onhostcontextchanged = (params) => {
  if (params.theme) {
    applyDocumentTheme(params.theme);
  }
};

// Apply initial theme after connecting
app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx?.theme) {
    applyDocumentTheme(ctx.theme);
  }
});
`Copy
```

#### Example: Use with CSS selectors[](#example-use-with-css-selectors)

```
`[data-theme="dark"] {
  --bg-color: #1a1a1a;
}
[data-theme="light"] {
  --bg-color: #ffffff;
}
`Copy
```

#### See[](#see)

- [`getDocumentTheme`](app.getDocumentTheme.html) to read the current theme

- [`McpUiTheme`](../types/app.McpUiTheme.html) for the theme type

- Defined in [src/styles.ts:75](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/styles.ts#L75)

