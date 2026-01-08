import { z } from "zod";

/**
 * Schema for noauth security scheme
 */
export const NoAuthSecuritySchemeSchema = z.object({
  type: z.literal("noauth"),
});

/**
 * Schema for OAuth2 security scheme
 */
export const OAuth2SecuritySchemeSchema = z.object({
  type: z.literal("oauth2"),
  scopes: z
    .array(z.string().min(1))
    .min(1, "OAuth2 scheme requires at least one scope"),
});

/**
 * Union schema for all security schemes
 */
export const SecuritySchemeSchema = z.discriminatedUnion("type", [
  NoAuthSecuritySchemeSchema,
  OAuth2SecuritySchemeSchema,
]);

export type SecurityScheme = z.infer<typeof SecuritySchemeSchema>;

/**
 * Schema for OAuth resource server configuration
 */
export const OAuthResourceServerConfigSchema = z.object({
  resource: z
    .string()
    .url("Resource must be a valid HTTPS URL")
    .startsWith("https://"),
  authorizationServers: z
    .array(z.string().url().startsWith("https://"))
    .min(1, "At least one authorization server required"),
  scopesSupported: z.array(z.string()).optional(),
  resourceDocumentation: z.string().url().optional(),
  bearerMethodsSupported: z
    .array(z.enum(["header", "body", "query"]))
    .default(["header"]),
});

export type OAuthResourceServerConfig = z.infer<
  typeof OAuthResourceServerConfigSchema
>;

/**
 * Schema for protected resource metadata response (RFC 9728)
 */
export const ProtectedResourceMetadataSchema = z.object({
  resource: z.string().url(),
  authorization_servers: z.array(z.string().url()),
  scopes_supported: z.array(z.string()).optional(),
  bearer_methods_supported: z.array(z.string()).optional(),
  resource_documentation: z.string().url().optional(),
});

export type ProtectedResourceMetadata = z.infer<
  typeof ProtectedResourceMetadataSchema
>;
