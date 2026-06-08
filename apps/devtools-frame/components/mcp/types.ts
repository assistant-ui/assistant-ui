export interface McpToolPreview {
  readonly name: string;
  readonly description?: string;
}

export interface McpServerPreview {
  readonly id: string;
  readonly name: string;
  readonly kind?: string;
  readonly url?: string;
  readonly connectionState: string;
  readonly lastError?: string;
  readonly authorizationUrl?: string;
  readonly tools: readonly McpToolPreview[];
}

export interface McpManagerPreview {
  readonly isHydrated?: boolean;
  readonly servers: readonly McpServerPreview[];
}
