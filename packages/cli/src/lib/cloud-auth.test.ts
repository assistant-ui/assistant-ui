import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cloudAccessToken,
  loginToCloud,
  logoutFromCloud,
  readCloudCredentials,
  saveCloudCredentials,
  type CloudAuthConfig,
  validateCloudUrl,
} from "./cloud-auth";

const { login, createDeviceLogin, isAccessDenied } = vi.hoisted(() => ({
  login: {
    start: vi.fn(),
    wait: vi.fn(),
    ensureFresh: vi.fn(),
    revoke: vi.fn(),
  },
  createDeviceLogin: vi.fn(),
  isAccessDenied: vi.fn(),
}));

vi.mock("aui-auth/device", async (importOriginal) => ({
  ...(await importOriginal<typeof import("aui-auth/device")>()),
  createDeviceLogin: (...args: unknown[]) => {
    createDeviceLogin(...args);
    return login;
  },
  isAccessDenied,
}));

const directories: string[] = [];
const fixture = async (): Promise<CloudAuthConfig> => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "assistant-ui-auth-"));
  directories.push(directory);
  return {
    issuer: "https://accounts.example.com",
    clientId: "assistant-ui-cli",
    credentialsFile: path.join(directory, "credentials.json"),
  };
};

const credentials = {
  user: { id: "user-1", email: "user@example.com", name: "User", image: null },
  tokens: {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    idToken: null,
    accessTokenExpiresAt: Date.now() + 60_000,
  },
};

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("cloud login", () => {
  it("allows secure hosted origins and loopback development but rejects plaintext remote origins", () => {
    expect(validateCloudUrl("https://cloud.example.com/")).toBe(
      "https://cloud.example.com",
    );
    expect(validateCloudUrl("http://localhost:3000")).toBe(
      "http://localhost:3000",
    );
    expect(() => validateCloudUrl("http://cloud.example.com")).toThrow("HTTPS");
    expect(() =>
      validateCloudUrl("https://cloud.example.com?key=secret"),
    ).toThrow();
    expect(() =>
      validateCloudUrl("https://cloud.example.com#fragment"),
    ).toThrow();
  });
  it("saves approved device credentials with private permissions and no token output", async () => {
    const config = await fixture();
    login.start.mockResolvedValue({
      userCode: "ABCD",
      verificationUriComplete: "https://accounts.example.com/device?code=ABCD",
    });
    login.wait.mockResolvedValue(credentials);
    const print = vi.fn();
    await loginToCloud(config, { noOpen: true, print });
    expect(await readCloudCredentials(config)).toMatchObject(credentials);
    if (process.platform !== "win32")
      expect((await stat(config.credentialsFile)).mode & 0o777).toBe(0o600);
    expect(JSON.stringify(print.mock.calls)).not.toContain("access-token");
    expect(JSON.stringify(print.mock.calls)).not.toContain("refresh-token");
  });

  it("persists rotated refresh credentials before another command uses them", async () => {
    const config = await fixture();
    await saveCloudCredentials(config, credentials);
    login.ensureFresh.mockResolvedValue({
      ...credentials,
      tokens: {
        ...credentials.tokens,
        accessToken: "rotated-access",
        refreshToken: "rotated-refresh",
      },
    });
    expect(await cloudAccessToken(config)).toBe("rotated-access");
    expect(
      JSON.parse(await readFile(config.credentialsFile, "utf8")).tokens
        .refreshToken,
    ).toBe("rotated-refresh");
  });

  it("does not discard credentials on a transient refresh failure", async () => {
    const config = await fixture();
    await saveCloudCredentials(config, credentials);
    login.ensureFresh.mockRejectedValue(new Error("network unavailable"));
    isAccessDenied.mockReturnValue(false);
    await expect(cloudAccessToken(config)).rejects.toThrow(
      "network unavailable",
    );
    expect(await readCloudCredentials(config)).toMatchObject(credentials);
  });

  it("revokes the login before forgetting its refresh token", async () => {
    const config = await fixture();
    await saveCloudCredentials(config, credentials);
    login.revoke.mockImplementation(async () => {
      expect(await readCloudCredentials(config)).toMatchObject(credentials);
    });
    await logoutFromCloud(config);
    expect(login.revoke).toHaveBeenCalledWith(
      expect.objectContaining(credentials),
    );
    expect(await readCloudCredentials(config)).toBeNull();
  });

  it("does not reuse credentials belonging to a different issuer", async () => {
    const config = await fixture();
    await saveCloudCredentials(config, credentials);
    expect(
      await readCloudCredentials({
        ...config,
        issuer: "https://different.example.com",
      }),
    ).toBeNull();
  });

  it("revokes at the stored issuer even if configuration has changed", async () => {
    const config = await fixture();
    await saveCloudCredentials(config, credentials);
    login.revoke.mockResolvedValue(undefined);
    await logoutFromCloud({
      ...config,
      issuer: "https://other.example.com",
      clientId: "other",
    });
    expect(createDeviceLogin).toHaveBeenLastCalledWith({
      issuer: config.issuer,
      clientId: config.clientId,
    });
    expect(await readCloudCredentials(config)).toBeNull();
  });

  it("reports malformed saved JSON values without reading their fields", async () => {
    const config = await fixture();
    await writeFile(config.credentialsFile, "null");
    await expect(readCloudCredentials(config)).rejects.toThrow(
      "Invalid saved login",
    );
  });
});
