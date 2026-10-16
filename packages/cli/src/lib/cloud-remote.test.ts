import { afterEach, describe, expect, it, vi } from "vitest";
import {
  joinCloudArgs,
  parseCloudCliResponse,
  runCloudCommand,
  sendCloudCommand,
  type CloudCliResponse,
} from "./cloud-remote";

afterEach(() => {
  vi.unstubAllGlobals();
});

const harness = (reply: CloudCliResponse, token: string | null = "token") => {
  const output = { stdout: "", stderr: "" };
  const send = vi.fn(async () => reply);
  return {
    output,
    send,
    run: (args: string[]) =>
      runCloudCommand(args, {
        cloudUrl: "https://cloud.example.com",
        accessToken: async () => token,
        stdout: (text) => {
          output.stdout += text;
        },
        stderr: (text) => {
          output.stderr += text;
        },
        send,
      }),
  };
};

describe("cloud remote commands", () => {
  it("quotes arguments so a POSIX shell split gives them back", () => {
    expect(
      joinCloudArgs(["projects", "list", "--org", "my org", "it's", ""]),
    ).toBe(`projects list --org 'my org' 'it'\\''s' ''`);
  });

  it("prints the envelope and exits with its code", async () => {
    const { run, send, output } = harness({
      stdout: "out\n",
      stderr: "err\n",
      exitCode: 3,
    });
    await expect(run(["whoami"])).resolves.toBe(3);
    expect(send).toHaveBeenCalledWith(
      "https://cloud.example.com",
      ["whoami"],
      "token",
    );
    expect(output).toEqual({ stdout: "out\n", stderr: "err\n" });
  });

  it("fails an action it does not know before printing anything", async () => {
    const { run, output } = harness({
      stdout: "uploading\n",
      exitCode: 0,
      actions: [{ type: "upload", arg: 2 }],
    });
    await expect(run(["files", "push", "a.txt"])).resolves.toBe(1);
    expect(output.stdout).toBe("");
    expect(output.stderr).toMatch(/newer assistant-ui.*"upload"/);
  });

  it("prints a failed request as one line and exits 1", async () => {
    const { run, send, output } = harness({ exitCode: 0 });
    send.mockRejectedValueOnce(new Error("Could not reach the cloud"));
    await expect(run(["whoami"])).resolves.toBe(1);
    expect(output.stderr).toBe("Could not reach the cloud\n");
  });

  it("sends anonymously when the saved login cannot be read", async () => {
    const output = { stdout: "", stderr: "" };
    const send = vi.fn(async () => ({ stdout: "help\n", exitCode: 0 }));
    await expect(
      runCloudCommand(["help"], {
        cloudUrl: "https://cloud.example.com",
        accessToken: async () => {
          throw new Error("Invalid saved login.");
        },
        stdout: (text) => {
          output.stdout += text;
        },
        stderr: (text) => {
          output.stderr += text;
        },
        send,
      }),
    ).resolves.toBe(0);
    expect(send).toHaveBeenCalledWith(
      "https://cloud.example.com",
      ["help"],
      null,
    );
    expect(output).toEqual({
      stdout: "help\n",
      stderr: "Invalid saved login.\n",
    });
  });

  it("accepts only a well-formed envelope", () => {
    expect(parseCloudCliResponse({ stdout: "x", exitCode: 0 })).toEqual({
      stdout: "x",
      exitCode: 0,
    });
    for (const bad of [
      null,
      "text",
      { stdout: "x" },
      { exitCode: 1.5 },
      { exitCode: 256 },
      { exitCode: -1 },
      { exitCode: 0, stderr: 3 },
      { exitCode: 0, actions: [{}] },
    ]) {
      expect(parseCloudCliResponse(bad)).toBeNull();
    }
  });

  it("posts the command string, client and bearer token", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ stdout: "ok\n", exitCode: 0 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      sendCloudCommand("https://cloud.example.com/", ["help", "a b"], "tok"),
    ).resolves.toEqual({ stdout: "ok\n", exitCode: 0 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://cloud.example.com/api/cli/run");
    expect(init.headers).toMatchObject({ Authorization: "Bearer tok" });
    expect(JSON.parse(init.body as string)).toMatchObject({
      command: "help 'a b'",
      client: { name: "assistant-ui" },
    });
  });

  it("sends no Authorization header when signed out and rejects a non-envelope", async () => {
    const fetchMock = vi.fn(
      async () => new Response("<html>", { status: 502 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      sendCloudCommand("https://cloud.example.com", ["help"], null),
    ).rejects.toThrow(/Unexpected response .*502/);
    const init = (
      fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    )[1];
    expect(init.headers).not.toHaveProperty("Authorization");
  });
});
