import { afterEach, describe, expect, it, vi } from "vitest";

const { getCoAuthorUser, getCommitCoAuthors } = await import("./github");

const commits = (message: string) =>
  new Response(JSON.stringify([{ commit: { message } }]), { status: 200 });

const firstPage = () =>
  new Response(
    JSON.stringify([
      {
        commit: {
          message: "Co-authored-by: Bot <42+helper@users.noreply.github.com>",
        },
      },
    ]),
    {
      status: 200,
      headers: {
        Link: '<https://api.github.com/repos/assistant-ui/assistant-ui/commits?per_page=100&page=2>; rel="last"',
      },
    },
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getCommitCoAuthors", () => {
  it("aggregates co-authors from every page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        /[?&]page=1(?:&|$)/.test(url)
          ? firstPage()
          : commits(
              "Co-authored-by: Helper <42+HELPER@users.noreply.github.com>",
            ),
      ),
    );

    await expect(getCommitCoAuthors()).resolves.toEqual([
      {
        name: "Bot",
        email: "42+helper@users.noreply.github.com",
        id: 42,
        login: "helper",
        count: 2,
      },
    ]);
  });

  it.each(["non-ok", "throws"])(
    "returns null when a later page %s",
    async (failure) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string) => {
          if (/[?&]page=1(?:&|$)/.test(url)) return firstPage();
          if (failure === "throws") throw new Error("socket hang up");
          return new Response("unavailable", { status: 502 });
        }),
      );

      await expect(getCommitCoAuthors()).resolves.toBeNull();
    },
  );
});

describe("getCoAuthorUser", () => {
  it("drops a missing account", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 404 })),
    );

    await expect(getCoAuthorUser("missing #bot")).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      "https://api.github.com/users/missing%20%23bot",
      expect.anything(),
    );
  });

  it("rejects a failed lookup", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 503 })),
    );

    await expect(getCoAuthorUser(42)).rejects.toThrow("503");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.github.com/user/42",
      expect.anything(),
    );
  });

  it("rejects a malformed account", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ login: "helper" }))),
    );

    await expect(getCoAuthorUser("helper")).rejects.toThrow("invalid account");
  });
});
