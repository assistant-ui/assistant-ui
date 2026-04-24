// Forked from @changesets/changelog-github@0.6.0
// Difference: moves the author credit from " Thanks @user!" before the summary
// to " (@user)" at the end of the first line.
// https://github.com/changesets/changesets/blob/main/packages/changelog-github/src/index.ts

const {
  getInfo,
  getInfoFromPullRequest,
} = require("@changesets/get-github-info");

function linkifyIssueRefs(line, { serverUrl, repo }) {
  return line.replace(/\[.*?\]\(.*?\)|\B#([1-9]\d*)\b/g, (match, issue) =>
    issue ? `[#${issue}](${serverUrl}/${repo}/issues/${issue})` : match,
  );
}

function readEnv() {
  const GITHUB_SERVER_URL =
    process.env.GITHUB_SERVER_URL || "https://github.com";
  return { GITHUB_SERVER_URL };
}

const changelogFunctions = {
  getDependencyReleaseLine: async (
    changesets,
    dependenciesUpdated,
    options,
  ) => {
    if (!options.repo) {
      throw new Error(
        'Please provide a repo to this changelog generator like this:\n"changelog": ["./.changeset/changelog.cjs", { "repo": "org/repo" }]',
      );
    }
    if (dependenciesUpdated.length === 0) return "";

    const changesetLink = `- Updated dependencies [${(
      await Promise.all(
        changesets.map(async (cs) => {
          if (cs.commit) {
            const { links } = await getInfo({
              repo: options.repo,
              commit: cs.commit,
            });
            return links.commit;
          }
        }),
      )
    )
      .filter((_) => _)
      .join(", ")}]:`;

    const updatedDependenciesList = dependenciesUpdated.map(
      (dependency) => `  - ${dependency.name}@${dependency.newVersion}`,
    );

    return [changesetLink, ...updatedDependenciesList].join("\n");
  },
  getReleaseLine: async (changeset, type, options) => {
    const { GITHUB_SERVER_URL } = readEnv();
    if (!options || !options.repo) {
      throw new Error(
        'Please provide a repo to this changelog generator like this:\n"changelog": ["./.changeset/changelog.cjs", { "repo": "org/repo" }]',
      );
    }

    let prFromSummary;
    let commitFromSummary;
    const usersFromSummary = [];

    const replacedChangelog = changeset.summary
      .replace(/^\s*(?:pr|pull|pull\s+request):\s*#?(\d+)/im, (_, pr) => {
        const num = Number(pr);
        if (!Number.isNaN(num)) prFromSummary = num;
        return "";
      })
      .replace(/^\s*commit:\s*([^\s]+)/im, (_, commit) => {
        commitFromSummary = commit;
        return "";
      })
      .replace(/^\s*(?:author|user):\s*@?([^\s]+)/gim, (_, user) => {
        usersFromSummary.push(user);
        return "";
      })
      .trim();

    const [firstLine, ...futureLines] = replacedChangelog
      .split("\n")
      .map((l) => l.trimEnd());

    const links = await (async () => {
      if (prFromSummary !== undefined) {
        let { links } = await getInfoFromPullRequest({
          repo: options.repo,
          pull: prFromSummary,
        });
        if (commitFromSummary) {
          const shortCommitId = commitFromSummary.slice(0, 7);
          links = {
            ...links,
            commit: `[\`${shortCommitId}\`](${GITHUB_SERVER_URL}/${options.repo}/commit/${commitFromSummary})`,
          };
        }
        return links;
      }
      const commitToFetchFrom = commitFromSummary || changeset.commit;
      if (commitToFetchFrom) {
        const { links } = await getInfo({
          repo: options.repo,
          commit: commitToFetchFrom,
        });
        return links;
      }
      return { commit: null, pull: null, user: null };
    })();

    const users = usersFromSummary.length
      ? usersFromSummary
          .map(
            (userFromSummary) =>
              `[@${userFromSummary}](${GITHUB_SERVER_URL}/${userFromSummary})`,
          )
          .join(", ")
      : links.user;

    const prefix = [
      links.pull === null ? "" : ` ${links.pull}`,
      links.commit === null ? "" : ` ${links.commit}`,
    ].join("");

    const suffix = users === null ? "" : ` (${users})`;

    const renderedFirstLine = linkifyIssueRefs(firstLine, {
      serverUrl: GITHUB_SERVER_URL,
      repo: options.repo,
    });

    const renderedFutureLines = futureLines
      .map(
        (l) =>
          `  ${linkifyIssueRefs(l, {
            serverUrl: GITHUB_SERVER_URL,
            repo: options.repo,
          })}`,
      )
      .join("\n");

    return `\n\n-${prefix ? `${prefix} -` : ""} ${renderedFirstLine}${suffix}\n${renderedFutureLines}`;
  },
};

module.exports = changelogFunctions;
module.exports.default = changelogFunctions;
