import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveWorkspacePreview } from "../tools/preview-tools.js";
import { sessionWorkspaceRegistry } from "../workspace-provider.js";

function makeContext(sessionId: string) {
  return {
    requestContext: {
      get: (key: string) => {
        if (key === "augmentTrace") return { sessionId };
        return undefined;
      },
    },
  };
}

describe("resolve_workspace_preview", () => {
  it("returns a Blaxel preview URL for the default app target", async () => {
    const sessionId = "preview-test-ready";
    sessionWorkspaceRegistry.set(sessionId, {
      workspace: {} as any,
      providerKind: "sandbox",
      sandboxInstance: {
        previews: {
          createIfNotExists: async (preview: any) => ({
            spec: {
              url: `https://example.preview.bl.run/${preview.metadata.name}`,
              port: preview.spec.port,
            },
          }),
        },
      },
    });

    try {
      const result = await (resolveWorkspacePreview as any).execute(
        {},
        makeContext(sessionId),
      );

      assert.equal(result.status, "ready");
      assert.equal(result.source, "sandbox");
      assert.equal(result.provider, "blaxel");
      assert.equal(result.port, 3000);
      assert.match(result.url, /preview-port-3000/);
    } finally {
      sessionWorkspaceRegistry.delete(sessionId);
    }
  });

  it("keeps explicit declared sandbox ports working as an advanced override", async () => {
    const sessionId = "preview-test-explicit-port";
    sessionWorkspaceRegistry.set(sessionId, {
      workspace: {} as any,
      providerKind: "sandbox",
      sandboxInstance: {
        previews: {
          createIfNotExists: async (preview: any) => ({
            spec: {
              url: `https://example.preview.bl.run/${preview.metadata.name}`,
              port: preview.spec.port,
            },
          }),
        },
      },
    });

    try {
      const result = await (resolveWorkspacePreview as any).execute(
        { port: 4567 },
        makeContext(sessionId),
      );

      assert.equal(result.status, "ready");
      assert.equal(result.source, "sandbox");
      assert.equal(result.provider, "blaxel");
      assert.equal(result.port, 4567);
      assert.match(result.url, /preview-port-4567/);
    } finally {
      sessionWorkspaceRegistry.delete(sessionId);
    }
  });

  it("rejects Blaxel reserved preview ports before calling the SDK", async () => {
    const sessionId = "preview-test-reserved-port";
    let sdkCalled = false;
    sessionWorkspaceRegistry.set(sessionId, {
      workspace: {} as any,
      providerKind: "sandbox",
      sandboxInstance: {
        previews: {
          createIfNotExists: async () => {
            sdkCalled = true;
            return {};
          },
        },
      },
    });

    try {
      const result = await (resolveWorkspacePreview as any).execute(
        { port: 80 },
        makeContext(sessionId),
      );

      assert.equal(result.status, "failed");
      assert.equal(result.source, "sandbox");
      assert.equal(result.provider, "blaxel");
      assert.equal(sdkCalled, false);
      assert.match(result.error, /Port 80/);
      assert.match(result.error, /reserved/);
      assert.match(result.error, /3000/);
    } finally {
      sessionWorkspaceRegistry.delete(sessionId);
    }
  });

  it("rejects undeclared Blaxel preview ports before calling the SDK", async () => {
    const sessionId = "preview-test-undeclared-port";
    let sdkCalled = false;
    sessionWorkspaceRegistry.set(sessionId, {
      workspace: {} as any,
      providerKind: "sandbox",
      sandboxInstance: {
        previews: {
          createIfNotExists: async () => {
            sdkCalled = true;
            return {};
          },
        },
      },
    });

    try {
      const result = await (resolveWorkspacePreview as any).execute(
        { port: 3001 },
        makeContext(sessionId),
      );

      assert.equal(result.status, "failed");
      assert.equal(result.source, "sandbox");
      assert.equal(result.provider, "blaxel");
      assert.equal(sdkCalled, false);
      assert.match(result.error, /Port 3001/);
      assert.match(result.error, /not declared/);
      assert.match(result.error, /3000/);
      assert.match(result.error, /4567/);
    } finally {
      sessionWorkspaceRegistry.delete(sessionId);
    }
  });

  it("formats structured Blaxel SDK errors instead of [object Object]", async () => {
    const sessionId = "preview-test-structured-error";
    sessionWorkspaceRegistry.set(sessionId, {
      workspace: {} as any,
      providerKind: "sandbox",
      sandboxInstance: {
        previews: {
          createIfNotExists: async () => {
            throw {
              code: 400,
              error: "port 80 is reserved and cannot be used",
            };
          },
        },
      },
    });

    try {
      const result = await (resolveWorkspacePreview as any).execute(
        { port: 3000 },
        makeContext(sessionId),
      );

      assert.equal(result.status, "failed");
      assert.equal(result.source, "sandbox");
      assert.equal(result.provider, "blaxel");
      assert.match(result.error, /HTTP 400/);
      assert.match(result.error, /port 80 is reserved/);
      assert.equal(result.error.includes("[object Object]"), false);
    } finally {
      sessionWorkspaceRegistry.delete(sessionId);
    }
  });
});
