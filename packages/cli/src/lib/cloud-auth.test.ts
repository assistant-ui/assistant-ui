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

const setupLogin = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock("./cloud-setup-login", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./cloud-setup-login")>()),
  connectCloudLoginSetup: setupLogin.connect,
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

describe("cloud login through the setup wizard", () => {
  const bridge = () => {
    const controller = new AbortController();
    const setup = {
      signal: controller.signal,
      publish: vi.fn().mockResolvedValue(undefined),
      complete: vi.fn().mockResolvedValue(undefined),
      dispose: vi.fn(),
    };
    setupLogin.connect.mockResolvedValue(setup);
    return { controller, setup };
  };
  const authorization = {
    deviceCode: "private-device-code",
    userCode: "ABCD-EFGH",
    verificationUriComplete:
      "https://accounts.assistant-ui.com/device?user_code=ABCD-EFGH",
    expiresAt: Date.now() + 60_000,
    interval: 5,
  };

  it("keeps device polling and tokens in the CLI and reports only public approval and status", async () => {
    const config = await fixture();
    const { setup } = bridge();
    login.start.mockResolvedValue(authorization);
    login.wait.mockResolvedValue(credentials);
    const print = vi.fn();
    await loginToCloud(config, {
      setupUrl: "https://checkout.test/session",
      print,
    });
    expect(setup.publish).toHaveBeenCalledWith(authorization, config.issuer);
    expect(login.wait).toHaveBeenLastCalledWith(authorization, {
      signal: expect.any(AbortSignal),
    });
    expect(setup.complete).toHaveBeenCalledWith("signed-in");
    expect(setup.dispose).toHaveBeenCalledOnce();
    expect(await readCloudCredentials(config)).toMatchObject(credentials);
    expect(JSON.stringify(print.mock.calls)).not.toMatch(
      /private-device-code|access-token|refresh-token/,
    );
    expect(JSON.stringify(setup.complete.mock.calls)).not.toContain("token");
  });
  it("refuses to save late credentials after the wizard cancels and revokes that grant", async () => {
    const config = await fixture();
    const { controller, setup } = bridge();
    login.start.mockResolvedValue(authorization);
    login.revoke.mockResolvedValue(undefined);
    login.wait.mockImplementationOnce(async () => {
      controller.abort(new Error("wizard cancelled"));
      return credentials;
    });
    await expect(
      loginToCloud(config, {
        setupUrl: "https://checkout.test/session",
        print: () => {},
      }),
    ).rejects.toThrow("wizard cancelled");
    expect(await readCloudCredentials(config)).toBeNull();
    expect(login.revoke).toHaveBeenLastCalledWith(credentials);
    expect(setup.complete).toHaveBeenCalledWith("cancelled");
    expect(setup.dispose).toHaveBeenCalledOnce();
  });
  it("reports a denied grant without storing credentials or exposing the error to the wizard", async () => {
    const config = await fixture();
    const { setup } = bridge();
    login.start.mockResolvedValue(authorization);
    login.wait.mockRejectedValueOnce(new Error("access_denied"));
    await expect(
      loginToCloud(config, {
        setupUrl: "https://checkout.test/session",
        print: () => {},
      }),
    ).rejects.toThrow("access_denied");
    expect(await readCloudCredentials(config)).toBeNull();
    expect(setup.complete).toHaveBeenCalledWith("failed");
    expect(setup.dispose).toHaveBeenCalledOnce();
  });
  it("retains a successful local login when publishing its terminal status fails", async () => {
    const config = await fixture();
    const { setup } = bridge();
    setup.complete.mockRejectedValueOnce(new Error("closed connection"));
    login.start.mockResolvedValue(authorization);
    login.wait.mockResolvedValueOnce(credentials);
    const print = vi.fn();
    expect(
      await loginToCloud(config, {
        setupUrl: "https://checkout.test/session",
        print,
      }),
    ).toEqual(credentials);
    expect(await readCloudCredentials(config)).toMatchObject(credentials);
    expect(print).toHaveBeenCalledWith(
      "Signed in locally. The setup connection could not be updated.",
    );
    expect(setup.dispose).toHaveBeenCalledOnce();
  });
  it("does not initiate device authorization when the setup connection fails", async () => {
    const config = await fixture();
    setupLogin.connect.mockRejectedValueOnce(new Error("session closed"));
    const count = login.start.mock.calls.length;
    await expect(
      loginToCloud(config, {
        setupUrl: "https://checkout.test/session",
        print: () => {},
      }),
    ).rejects.toThrow("session closed");
    expect(login.start.mock.calls.length).toBe(count);
  });
});
