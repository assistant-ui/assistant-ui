# McpUiResourceMeta

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

#### Description[](#description)

UI Resource metadata for security and rendering configuration.

##### Index

### Properties

[csp?](#csp)
[domain?](#domain)
[permissions?](#permissions)
[prefersBorder?](#prefersborder)

### `Optional`csp[](#csp)

csp?: [McpUiResourceCsp](app.McpUiResourceCsp.html)
#### Description[](#description-1)

Content Security Policy configuration.

- Defined in [src/spec.types.ts:574](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L574)

### `Optional`domain[](#domain)

domain?: string
#### Description[](#description-2)

Dedicated origin for view sandbox.

- Defined in [src/spec.types.ts:578](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L578)

### `Optional`permissions[](#permissions)

permissions?: [McpUiResourcePermissions](app.McpUiResourcePermissions.html)
#### Description[](#description-3)

Sandbox permissions requested by the UI.

- Defined in [src/spec.types.ts:576](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L576)

### `Optional`prefersBorder[](#prefersborder)

prefersBorder?: boolean
#### Description[](#description-4)

Visual boundary preference - true if UI prefers a visible border.

- Defined in [src/spec.types.ts:580](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L580)

