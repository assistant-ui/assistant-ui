# McpUiToolResultNotification

> Auto-generated from TypeDoc. See [original](https://modelcontextprotocol.github.io/ext-apps/api) for the latest version.

#### Description[](#description)

Notification containing tool execution result (Host -> View).

##### Index

### Properties

[method](#method)
[params](#params)

### method[](#method)

method: "ui/notifications/tool-result"

- Defined in [src/spec.types.ts:268](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L268)

### params[](#params)

params: {
    _meta?: {
        "io.modelcontextprotocol/related-task"?: { taskId: string };
        progressToken?: string | number;
        [key: string]: unknown;
    };
    content: (
        | {
            _meta?: { [key: string]: unknown };
            annotations?: {
                audience?: ("user" | "assistant")[];
                lastModified?: string;
                priority?: number;
            };
            text: string;
            type: "text";
        }
        | {
            _meta?: { [key: string]: unknown };
            annotations?: {
                audience?: ("user" | "assistant")[];
                lastModified?: string;
                priority?: number;
            };
            data: string;
            mimeType: string;
            type: "image";
        }
        | {
            _meta?: { [key: string]: unknown };
            annotations?: {
                audience?: ("user" | "assistant")[];
                lastModified?: string;
                priority?: number;
            };
            data: string;
            mimeType: string;
            type: "audio";
        }
        | {
            _meta?: { [key: string]: unknown };
            annotations?: {
                audience?: ("user" | "assistant")[];
                lastModified?: string;
                priority?: number;
            };
            description?: string;
            icons?: {
                mimeType?: string;
                sizes?: string[];
                src: string;
                theme?: "light"
                | "dark";
            }[];
            mimeType?: string;
            name: string;
            title?: string;
            type: "resource_link";
            uri: string;
        }
        | {
            _meta?: { [key: string]: unknown };
            annotations?: {
                audience?: ("user" | "assistant")[];
                lastModified?: string;
                priority?: number;
            };
            resource: | {
                _meta?: { [key: string]: unknown };
                mimeType?: string;
                text: string;
                uri: string;
            }
            | {
                _meta?: { [key: string]: unknown };
                blob: string;
                mimeType?: string;
                uri: string;
            };
            type: "resource";
        }
    )[];
    isError?: boolean;
    structuredContent?: { [key: string]: unknown };
    [key: string]: unknown;
}
#### Description[](#description-1)

Standard MCP tool execution result.

- Defined in [src/spec.types.ts:270](https://github.com/modelcontextprotocol/ext-apps/blob/main/src/spec.types.ts#L270)

