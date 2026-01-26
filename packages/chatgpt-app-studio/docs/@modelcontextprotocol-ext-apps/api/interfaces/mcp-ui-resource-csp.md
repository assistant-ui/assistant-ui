# McpUiResourceCsp

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

#### Description[](#description)

Content Security Policy configuration for UI resources.

##### Index

### Properties

[baseUriDomains?](#baseuridomains)
[connectDomains?](#connectdomains)
[frameDomains?](#framedomains)
[resourceDomains?](#resourcedomains)

### `Optional`baseUriDomains[](#baseuridomains)

baseUriDomains?: string[]
#### Description[](#description-1)

Allowed base URIs for the document (base-uri directive).

- Defined in [src/spec.types.ts:550](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L550)

### `Optional`connectDomains[](#connectdomains)

connectDomains?: string[]
#### Description[](#description-2)

Origins for network requests (fetch/XHR/WebSocket).

- Defined in [src/spec.types.ts:544](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L544)

### `Optional`frameDomains[](#framedomains)

frameDomains?: string[]
#### Description[](#description-3)

Origins for nested iframes (frame-src directive).

- Defined in [src/spec.types.ts:548](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L548)

### `Optional`resourceDomains[](#resourcedomains)

resourceDomains?: string[]
#### Description[](#description-4)

Origins for static resources (scripts, images, styles, fonts).

- Defined in [src/spec.types.ts:546](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L546)

