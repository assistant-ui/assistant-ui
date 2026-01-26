# McpUiInitializeRequest

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

#### Description[](#description)

Initialization request sent from View to Host.

#### See[](#see)

[`App.connect`](../classes/app.App.html#connect) for the method that sends this request

##### Index

### Properties

[method](#method)
[params](#params)

### method[](#method)

method: "ui/initialize"

- Defined in [src/spec.types.ts:499](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L499)

### params[](#params)

params: {
    appCapabilities: [McpUiAppCapabilities](app.McpUiAppCapabilities.html);
    appInfo: {
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
    };
    protocolVersion: string;
}
#### Type Declaration

- ##### appCapabilities: [McpUiAppCapabilities](app.McpUiAppCapabilities.html)

#### Description[](#description-1)

Features and capabilities this app provides.

- ##### appInfo: {
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

#### Description[](#description-2)

App identification (name and version).

- ##### protocolVersion: string

#### Description[](#description-3)

Protocol version this app supports.

- Defined in [src/spec.types.ts:500](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L500)

