import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getContributors,
  getCommitCoAuthors,
  getCoAuthorUser,
  getStarHistory,
  getUser,
} = vi.hoisted(() => ({
  getContributors: vi.fn(),
  getCommitCoAuthors: vi.fn(),
  getCoAuthorUser: vi.fn(),
  getStarHistory: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("./github", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./github")>()),
  getContributors,
  getCommitCoAuthors,
  getCoAuthorUser,
  getStarHistory,
  getUser,
}));

const { fetchContributors, fetchBotCoAuthors, fetchStarHistory } =
  await import("./traction");

beforeEach(() => {
  getContributors.mockReset();
  getCommitCoAuthors.mockReset();
  getCoAuthorUser.mockReset();
  getStarHistory.mockReset();
  getUser.mockReset();
});

describe("fetchContributors", () => {
  it("derives contributors from a complete read", async () => {
    getContributors.mockResolvedValue([
      {
        login: "alice",
        avatar_url: "https://example.com/avatar",
        html_url: "https://example.com/alice",
        contributions: 3,
      },
      {
        login: "helper[bot]",
        avatar_url: "",
        html_url: "",
        contributions: 9,
      },
    ]);

    await expect(fetchContributors()).resolves.toEqual([
      {
        login: "alice",
        avatarUrl: "https://example.com/avatar",
        htmlUrl: "https://example.com/alice",
        contributions: 3,
      },
    ]);
    expect(getContributors).toHaveBeenCalledWith();
  });

  it("returns null on an incomplete read", async () => {
    getContributors.mockResolvedValue(null);

    await expect(fetchContributors()).resolves.toBeNull();
  });
});

const coAuthor = (id: number, login: string) => ({
  name: login,
  email: `${id}+${login}@users.noreply.github.com`,
  id,
  login,
  count: 2,
});

describe("fetchBotCoAuthors", () => {
  it("derives bots from a complete scan and drops a missing account", async () => {
    getCommitCoAuthors.mockResolvedValue([
      coAuthor(1, "helper"),
      coAuthor(2, "missing"),
    ]);
    getCoAuthorUser.mockImplementation(async (identifier: number) =>
      identifier === 1
        ? {
            login: "helper[bot]",
            type: "Bot",
            avatarUrl: "https://example.com/avatar",
            htmlUrl: "https://example.com/helper",
          }
        : null,
    );

    await expect(fetchBotCoAuthors()).resolves.toEqual([
      {
        login: "helper[bot]",
        avatarUrl: "https://example.com/avatar",
        htmlUrl: "https://example.com/helper",
        contributions: 2,
      },
    ]);
    expect(getCommitCoAuthors).toHaveBeenCalledWith();
    expect(getCoAuthorUser).toHaveBeenCalledWith(1);
    expect(getCoAuthorUser).toHaveBeenCalledWith(2);
  });

  it("returns an empty list on an incomplete scan", async () => {
    getCommitCoAuthors.mockResolvedValue(null);

    await expect(fetchBotCoAuthors()).resolves.toEqual([]);
  });

  it("returns an empty list when an account lookup fails", async () => {
    getCommitCoAuthors.mockResolvedValue([
      coAuthor(1, "helper"),
      coAuthor(2, "unavailable"),
    ]);
    getCoAuthorUser.mockImplementation(async (identifier: number) => {
      if (identifier === 2) throw new Error("GitHub unavailable");
      return {
        login: "helper[bot]",
        type: "Bot",
        avatarUrl: "https://example.com/avatar",
        htmlUrl: "https://example.com/helper",
      };
    });

    await expect(fetchBotCoAuthors()).resolves.toEqual([]);
    expect(getCoAuthorUser).toHaveBeenCalledWith(1);
    expect(getCoAuthorUser).toHaveBeenCalledWith(2);
  });

  it("keeps the Claude fallback icon when its avatar lookup fails", async () => {
    getCommitCoAuthors.mockResolvedValue([
      {
        name: "Claude",
        email: "noreply@anthropic.com",
        id: null,
        login: null,
        count: 4,
      },
    ]);
    getUser.mockResolvedValue(null);

    await expect(fetchBotCoAuthors()).resolves.toEqual([
      {
        login: "Claude",
        avatarUrl: "/icons/anthropic.svg",
        htmlUrl: "https://claude.com",
        contributions: 4,
      },
    ]);
  });
});

describe("fetchStarHistory", () => {
  it("derives cumulative history from a complete read", async () => {
    getStarHistory.mockResolvedValue([
      { week: 1_705_190_400, total: 3, days: [] },
      { week: 1_704_585_600, total: 2, days: [] },
    ]);

    await expect(fetchStarHistory()).resolves.toEqual([
      { date: "2024-01-14T00:00:00.000Z", value: 2 },
      { date: "2024-01-21T00:00:00.000Z", value: 5 },
    ]);
    expect(getStarHistory).toHaveBeenCalledWith();
  });

  it.each([null, [{ week: 1_704_585_600, total: 2, days: [] }]])(
    "returns an empty list for an incomplete read",
    async (weeks) => {
      getStarHistory.mockResolvedValue(weeks);

      await expect(fetchStarHistory()).resolves.toEqual([]);
    },
  );
});
