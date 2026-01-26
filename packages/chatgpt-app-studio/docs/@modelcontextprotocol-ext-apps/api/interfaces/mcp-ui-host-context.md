# McpUiHostContext

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

#### Description[](#description)

Rich context about the host environment provided to views.

#### Indexable

- [key: string]: unknown
#### Description[](#description-1)

Allow additional properties for forward compatibility.

##### Index

### Properties

[availableDisplayModes?](#availabledisplaymodes)
[containerDimensions?](#containerdimensions)
[deviceCapabilities?](#devicecapabilities)
[displayMode?](#displaymode)
[locale?](#locale)
[platform?](#platform)
[safeAreaInsets?](#safeareainsets)
[styles?](#styles)
[theme?](#theme)
[timeZone?](#timezone)
[toolInfo?](#toolinfo)
[userAgent?](#useragent)

### `Optional`availableDisplayModes[](#availabledisplaymodes)

availableDisplayModes?: [McpUiDisplayMode](../types/app.McpUiDisplayMode.html)[]
#### Description[](#description-2)

Display modes the host supports.

- Defined in [src/spec.types.ts:324](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L324)

### `Optional`containerDimensions[](#containerdimensions)

containerDimensions?: ({ height: number; } | { maxHeight?: number | undefined; }) & ({ width: number; } | { maxWidth?: number | undefined; })
#### Description[](#description-3)

Container dimensions. Represents the dimensions of the iframe or other
container holding the app. Specify either width or maxWidth, and either height or maxHeight.

- Defined in [src/spec.types.ts:329](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L329)

### `Optional`deviceCapabilities[](#devicecapabilities)

deviceCapabilities?: { hover?: boolean; touch?: boolean }
#### Type Declaration

- ##### `Optional`hover?: boolean

#### Description[](#description-4)

Whether the device supports hover interactions.

- ##### `Optional`touch?: boolean

#### Description[](#description-5)

Whether the device supports touch input.

#### Description[](#description-6)

Device input capabilities.

- Defined in [src/spec.types.ts:358](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L358)

### `Optional`displayMode[](#displaymode)

displayMode?: [McpUiDisplayMode](../types/app.McpUiDisplayMode.html)
#### Description[](#description-7)

How the UI is currently displayed.

- Defined in [src/spec.types.ts:322](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L322)

### `Optional`locale[](#locale)

locale?: string
#### Description[](#description-8)

User's language and region preference in BCP 47 format.

- Defined in [src/spec.types.ts:350](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L350)

### `Optional`platform[](#platform)

platform?: "web" | "desktop" | "mobile"
#### Description[](#description-9)

Platform type for responsive design decisions.

- Defined in [src/spec.types.ts:356](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L356)

### `Optional`safeAreaInsets[](#safeareainsets)

safeAreaInsets?: { bottom: number; left: number; right: number; top: number }
#### Type Declaration

- ##### bottom: number

#### Description[](#description-10)

Bottom safe area inset in pixels.

- ##### left: number

#### Description[](#description-11)

Left safe area inset in pixels.

- ##### right: number

#### Description[](#description-12)

Right safe area inset in pixels.

- ##### top: number

#### Description[](#description-13)

Top safe area inset in pixels.

#### Description[](#description-14)

Mobile safe area boundaries in pixels.

- Defined in [src/spec.types.ts:365](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L365)

### `Optional`styles[](#styles)

styles?: [McpUiHostStyles](app.McpUiHostStyles.html)
#### Description[](#description-15)

Style configuration for theming the app.

- Defined in [src/spec.types.ts:320](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L320)

### `Optional`theme[](#theme)

theme?: [McpUiTheme](../types/app.McpUiTheme.html)
#### Description[](#description-16)

Current color theme preference.

- Defined in [src/spec.types.ts:318](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L318)

### `Optional`timeZone[](#timezone)

timeZone?: string
#### Description[](#description-17)

User's timezone in IANA format.

- Defined in [src/spec.types.ts:352](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L352)

### `Optional`toolInfo[](#toolinfo)

toolInfo?: {
    id?: RequestId;
    tool: {
        _meta?: { [key: string]: unknown };
        annotations?: {
            destructiveHint?: boolean;
            idempotentHint?: boolean;
            openWorldHint?: boolean;
            readOnlyHint?: boolean;
            title?: string;
        };
        description?: string;
        execution?: { taskSupport?: "optional"
        | "required"
        | "forbidden" };
        icons?: {
            mimeType?: string;
            sizes?: string[];
            src: string;
            theme?: "light" | "dark";
        }[];
        inputSchema: {
            properties?: { [key: string]: object };
            required?: string[];
            type: "object";
            [key: string]: unknown;
        };
        name: string;
        outputSchema?: {
            properties?: { [key: string]: object };
            required?: string[];
            type: "object";
            [key: string]: unknown;
        };
        title?: string;
    };
}
#### Type Declaration

- ##### `Optional`id?: RequestId

#### Description[](#description-18)

JSON-RPC id of the tools/call request.

- ##### tool: {
    _meta?: { [key: string]: unknown };
    annotations?: {
        destructiveHint?: boolean;
        idempotentHint?: boolean;
        openWorldHint?: boolean;
        readOnlyHint?: boolean;
        title?: string;
    };
    description?: string;
    execution?: { taskSupport?: "optional"
    | "required"
    | "forbidden" };
    icons?: {
        mimeType?: string;
        sizes?: string[];
        src: string;
        theme?: "light" | "dark";
    }[];
    inputSchema: {
        properties?: { [key: string]: object };
        required?: string[];
        type: "object";
        [key: string]: unknown;
    };
    name: string;
    outputSchema?: {
        properties?: { [key: string]: object };
        required?: string[];
        type: "object";
        [key: string]: unknown;
    };
    title?: string;
}

#### Description[](#description-19)

Tool definition including name, inputSchema, etc.

#### Description[](#description-20)

Metadata of the tool call that instantiated this App.

- Defined in [src/spec.types.ts:311](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L311)

### `Optional`userAgent[](#useragent)

userAgent?: string
#### Description[](#description-21)

Host application identifier.

- Defined in [src/spec.types.ts:354](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L354)

