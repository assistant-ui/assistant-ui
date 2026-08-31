---
"@assistant-ui/react-mcp": patch
---

fix: validate OAuth callback state and issuer parameters

the callback is now bound to the authorization request that started it. the generated state is persisted alongside its PKCE verifier, compared against the callback before anything is redeemed, and consumed once tokens are stored. the complete callback parameters are forwarded to the MCP SDK so it can validate the issuer per RFC 9207, which also means callback `error_description` text is no longer surfaced directly, since it is attacker-controlled in a mix-up attack.

an authorization started before this release has no persisted state, so its callback is rejected once with "no pending OAuth authorization request for this server" and that server has to be authorized again. stored tokens and client registrations are unaffected.
