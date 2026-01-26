# applyHostStyleVariables

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

- applyHostStyleVariables(styles: [McpUiStyles](../types/app.McpUiStyles.html), root?: HTMLElement): void[](#applyhoststylevariables)
Apply host style variables as CSS custom properties on an element.

This function takes the `variables` object from [`McpUiHostContext.styles`](../interfaces/app.McpUiHostContext.html#styles) and sets
each CSS variable on the specified root element (defaults to `document.documentElement`).
This allows apps to use the host's theming values via CSS variables like
`var(--color-background-primary)`.

#### Parameters

styles: [McpUiStyles](../types/app.McpUiStyles.html)The style variables object from `McpUiHostContext.styles.variables`

- root: HTMLElement = document.documentElementThe element to apply styles to (defaults to `document.documentElement`)

#### Returns void

#### Example: Apply style variables from host context[](#example-apply-style-variables-from-host-context)

```
`// Use CSS variables in your styles
document.body.style.background = "var(--color-background-primary)";

// Apply when host context changes
app.onhostcontextchanged = (params) => {
  if (params.styles?.variables) {
    applyHostStyleVariables(params.styles.variables);
  }
};

// Apply initial styles after connecting
app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx?.styles?.variables) {
    applyHostStyleVariables(ctx.styles.variables);
  }
});
`Copy
```

#### Example: Apply to a specific element[](#example-apply-to-a-specific-element)

```
`app.onhostcontextchanged = (params) => {
  const container = document.getElementById("app-root");
  if (container && params.styles?.variables) {
    applyHostStyleVariables(params.styles.variables, container);
  }
};
`Copy
```

#### Example: Use host style variables in CSS[](#example-use-host-style-variables-in-css)

```
`body {
  background-color: var(--color-background-primary);
  color: var(--color-text-primary);
}

.card {
  background-color: var(--color-background-secondary);
  border: 1px solid var(--color-border-primary);
}
`Copy
```

#### See[](#see)

- [`McpUiStyles`](../types/app.McpUiStyles.html) for the available CSS variables

- [`McpUiHostContext`](../interfaces/app.McpUiHostContext.html) for the full host context structure

- Defined in [src/styles.ts:139](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/styles.ts#L139)

