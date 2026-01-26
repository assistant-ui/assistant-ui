# McpUiHostCapabilities

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

#### Description[](#description)

Capabilities supported by the host application.

#### See[](#see)

[`McpUiInitializeResult`](app.McpUiInitializeResult.html) for the initialization result that includes these capabilities

##### Index

### Properties

[experimental?](#experimental)
[logging?](#logging)
[message?](#message)
[openLinks?](#openlinks)
[sandbox?](#sandbox)
[serverResources?](#serverresources)
[serverTools?](#servertools)
[updateModelContext?](#updatemodelcontext)

### `Optional`experimental[](#experimental)

experimental?: {}
#### Description[](#description-1)

Experimental features (structure TBD).

- Defined in [src/spec.types.ts:450](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L450)

### `Optional`logging[](#logging)

logging?: {}
#### Description[](#description-2)

Host accepts log messages.

- Defined in [src/spec.types.ts:464](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L464)

### `Optional`message[](#message)

message?: [McpUiSupportedContentBlockModalities](app.McpUiSupportedContentBlockModalities.html)
#### Description[](#description-3)

Host supports receiving content messages (ui/message) from the view.

- Defined in [src/spec.types.ts:475](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L475)

### `Optional`openLinks[](#openlinks)

openLinks?: {}
#### Description[](#description-4)

Host supports opening external URLs.

- Defined in [src/spec.types.ts:452](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L452)

### `Optional`sandbox[](#sandbox)

sandbox?: { csp?: [McpUiResourceCsp](app.McpUiResourceCsp.html); permissions?: [McpUiResourcePermissions](app.McpUiResourcePermissions.html) }
#### Type Declaration

- ##### `Optional`csp?: [McpUiResourceCsp](app.McpUiResourceCsp.html)

#### Description[](#description-5)

CSP domains approved by the host.

- ##### `Optional`permissions?: [McpUiResourcePermissions](app.McpUiResourcePermissions.html)

#### Description[](#description-6)

Permissions granted by the host (camera, microphone, geolocation).

#### Description[](#description-7)

Sandbox configuration applied by the host.

- Defined in [src/spec.types.ts:466](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L466)

### `Optional`serverResources[](#serverresources)

serverResources?: { listChanged?: boolean }
#### Type Declaration

- ##### `Optional`listChanged?: boolean

#### Description[](#description-8)

Host supports resources/list_changed notifications.

#### Description[](#description-9)

Host can proxy resource reads to the MCP server.

- Defined in [src/spec.types.ts:459](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L459)

### `Optional`serverTools[](#servertools)

serverTools?: { listChanged?: boolean }
#### Type Declaration

- ##### `Optional`listChanged?: boolean

#### Description[](#description-10)

Host supports tools/list_changed notifications.

#### Description[](#description-11)

Host can proxy tool calls to the MCP server.

- Defined in [src/spec.types.ts:454](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L454)

### `Optional`updateModelContext[](#updatemodelcontext)

updateModelContext?: [McpUiSupportedContentBlockModalities](app.McpUiSupportedContentBlockModalities.html)
#### Description[](#description-12)

Host accepts context updates (ui/update-model-context) to be included in the model's context for future turns.

- Defined in [src/spec.types.ts:473](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L473)

