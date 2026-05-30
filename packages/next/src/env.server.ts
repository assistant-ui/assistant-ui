// Resolved in `react-server` layers (Server Components + App Router route
// handlers). The matching `react-server` export condition selects this file;
// every other layer (SSR, browser) gets `env.client.ts`.
//
// Typed as `boolean` (not the literal `true`) so consuming `if (isServer)`
// branches are not narrowed/flagged as constant by TypeScript.
export const isServer: boolean = true;
