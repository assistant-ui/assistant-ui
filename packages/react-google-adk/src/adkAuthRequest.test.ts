import { describe, expect, it } from "vitest";
import { toAdkAuthReply } from "./adkAuthRequest";
import type { AdkAuthRequest } from "./types";

const CREDENTIAL_CALL = "adk-credential-1";

const apiKeyScheme = { type: "apiKey", in: "header", name: "x-api-key" };

const request = (authConfig: unknown): AdkAuthRequest => ({
  toolCallId: CREDENTIAL_CALL,
  authConfig,
});

const wire = (content: string) => JSON.parse(content);

describe("toAdkAuthReply", () => {
  it("answers the credential call with the request's config carrying the credential", () => {
    const reply = toAdkAuthReply(
      CREDENTIAL_CALL,
      { authType: "apiKey", apiKey: "secret" },
      [request({ authScheme: apiKeyScheme, credentialKey: "weather" })],
    );

    expect(reply).toMatchObject({
      type: "tool",
      tool_call_id: CREDENTIAL_CALL,
      name: "adk_request_credential",
      status: "success",
    });
    expect(wire(reply.content)).toEqual({
      authScheme: apiKeyScheme,
      credentialKey: "weather",
      exchangedAuthCredential: { authType: "apiKey", apiKey: "secret" },
    });
  });

  it("lays the OAuth2 answer over the exchanged credential the request issued", () => {
    const oauth2Scheme = { type: "oauth2", flows: {} };
    const reply = toAdkAuthReply(
      CREDENTIAL_CALL,
      {
        authType: "oauth2",
        oauth2: { authResponseUri: "https://app/cb?code=c&state=s" },
      },
      [
        request({
          authScheme: oauth2Scheme,
          credentialKey: "calendar",
          rawAuthCredential: { authType: "oauth2", oauth2: { clientId: "id" } },
          exchangedAuthCredential: {
            authType: "oauth2",
            oauth2: {
              clientId: "id",
              authUri: "https://idp/authorize?state=s",
              state: "s",
              redirectUri: "https://app/cb",
            },
          },
        }),
      ],
    );

    expect(wire(reply.content)).toEqual({
      authScheme: oauth2Scheme,
      credentialKey: "calendar",
      rawAuthCredential: { authType: "oauth2", oauth2: { clientId: "id" } },
      exchangedAuthCredential: {
        authType: "oauth2",
        oauth2: {
          clientId: "id",
          authUri: "https://idp/authorize?state=s",
          state: "s",
          redirectUri: "https://app/cb",
          authResponseUri: "https://app/cb?code=c&state=s",
        },
      },
    });
  });

  it("sends the credential alone when the request carried no config", () => {
    const reply = toAdkAuthReply(
      CREDENTIAL_CALL,
      { authType: "apiKey", apiKey: "secret" },
      [request(undefined)],
    );

    expect(wire(reply.content)).toEqual({
      exchangedAuthCredential: { authType: "apiKey", apiKey: "secret" },
    });
  });

  it("throws for an id that is not a pending request", () => {
    expect(() =>
      toAdkAuthReply("adk-credential-2", { authType: "apiKey", apiKey: "x" }, [
        request({ authScheme: apiKeyScheme, credentialKey: "weather" }),
      ]),
    ).toThrow(
      'No pending ADK auth request for tool call id "adk-credential-2"',
    );
  });
});
