# McpUiInitializeResult

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

#### Description[](#description)

Initialization result returned from Host to View.

#### See[](#see)

[`McpUiInitializeRequest`](app.McpUiInitializeRequest.html)

#### Indexable

- [key: string]: unknown
Index signature required for MCP SDK `Protocol` class compatibility.
Note: The generated schema uses passthrough() to allow additional properties.

##### Index

### Properties

[hostCapabilities](#hostcapabilities)
[hostContext](#hostcontext)
[hostInfo](#hostinfo)
[protocolVersion](#protocolversion)

### hostCapabilities[](#hostcapabilities)

hostCapabilities: [McpUiHostCapabilities](app.McpUiHostCapabilities.html)
#### Description[](#description-1)

Features and capabilities provided by the host.

- Defined in [src/spec.types.ts:520](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L520)

### hostContext[](#hostcontext)

hostContext: [McpUiHostContext](app.McpUiHostContext.html)
#### Description[](#description-2)

Rich context about the host environment.

- Defined in [src/spec.types.ts:522](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L522)

### hostInfo[](#hostinfo)

hostInfo: {
    description?: string;
    icons?: {
        mimeType?: string;
        sizes?: string[];
        src: string;
        theme?: "light" | "dark";
    }[];
    name: string;
    title?: string;
    version: string;
    websiteUrl?: string;
}
#### Description[](#description-3)

Host application identification and version.

- Defined in [src/spec.types.ts:518](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L518)

### protocolVersion[](#protocolversion)

protocolVersion: string
#### Description[](#description-4)

Negotiated protocol version string (e.g., "2025-11-21").

- Defined in [src/spec.types.ts:516](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L516)

