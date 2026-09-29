import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  readProjectVersion,
  runPythonVersionCheck,
} from "./check-python-versions.mjs";

function pyproject(version) {
  return `[build-system]\nrequires = ["hatchling"]\n\n[project]\nname = "fixture"\nversion = "${version}"\ndependencies = []\n`;
}

function git(root, ...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function commit(root, files, message) {
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  }
  git(root, "add", ".");
  git(
    root,
    "-c",
    "user.name=fixture",
    "-c",
    "user.email=fixture@example.com",
    "commit",
    "-q",
    "-m",
    message,
  );
  return git(root, "rev-parse", "HEAD");
}

function withRepo(run) {
  const root = mkdtempSync(path.join(tmpdir(), "aui-python-versions-"));
  try {
    git(root, "init", "-q", "-b", "main");
    const base = commit(
      root,
      {
        "python/pkg/pyproject.toml": pyproject("0.0.1"),
        "python/pkg/uv.lock": "version = 1\n",
        "python/pkg/src/pkg/__init__.py": "VALUE = 1\n",
      },
      "base",
    );
    run(root, base);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function runExecutable(root, env) {
  return spawnSync(
    process.execPath,
    [path.join(import.meta.dirname, "check-python-versions.mjs")],
    {
      encoding: "utf8",
      env: { ...process.env, PYTHON_VERSION_CHECK_ROOT: root, ...env },
    },
  );
}

test("readProjectVersion reads the version of the [project] table only", () => {
  assert.equal(readProjectVersion(pyproject("0.0.36")), "0.0.36");
  assert.equal(
    readProjectVersion(
      '[tool.poetry]\nversion = "9.9.9"\n\n[project]\nname = "fixture"\nversion = \'1.2.3\'  # pinned\n',
    ),
    "1.2.3",
  );
  assert.equal(
    readProjectVersion(
      '[project]\nname = "fixture"\ndynamic = ["version"]\n\n[tool.other]\nversion = "5.0.0"\n',
    ),
    null,
  );
});

test("a version bump next to other package edits is rejected", () => {
  withRepo((root, base) => {
    const head = commit(
      root,
      {
        "python/pkg/pyproject.toml": pyproject("0.0.2"),
        "python/pkg/uv.lock": "version = 2\n",
        "python/pkg/src/pkg/__init__.py": "VALUE = 2\n",
        "packages/web/index.ts": "export {};\n",
      },
      "fix with a bump",
    );
    assert.deepEqual(runPythonVersionCheck(root, base, head), {
      versionChanges: [
        { file: "python/pkg/pyproject.toml", from: "0.0.1", to: "0.0.2" },
      ],
      mixedFiles: ["python/pkg/src/pkg/__init__.py"],
    });
  });
});

test("a release PR changes no package file except pyproject.toml and uv.lock", () => {
  withRepo((root, base) => {
    const head = commit(
      root,
      {
        "python/pkg/pyproject.toml": pyproject("0.0.2"),
        "python/pkg/uv.lock": "version = 2\n",
        "python/consumer/uv.lock": "version = 2\n",
        "python/AGENTS.md": "# python\n",
        "docs/release.md": "0.0.2\n",
      },
      "release",
    );
    assert.deepEqual(runPythonVersionCheck(root, base, head), {
      versionChanges: [
        { file: "python/pkg/pyproject.toml", from: "0.0.1", to: "0.0.2" },
      ],
      mixedFiles: [],
    });
  });
});

test("package edits that keep every version pass, including a new package", () => {
  withRepo((root, base) => {
    const head = commit(
      root,
      {
        "python/pkg/pyproject.toml": pyproject("0.0.1").replace(
          "dependencies = []",
          'dependencies = ["starlette"]',
        ),
        "python/pkg/src/pkg/__init__.py": "VALUE = 2\n",
        "python/fresh/pyproject.toml": pyproject("0.1.0"),
        "python/fresh/src/fresh/__init__.py": "",
      },
      "fix and a new package",
    );
    assert.deepEqual(runPythonVersionCheck(root, base, head), {
      versionChanges: [],
      mixedFiles: [],
    });
  });
});

test("changes on the target branch after the fork do not count against the PR", () => {
  withRepo((root, base) => {
    git(root, "checkout", "-q", "-b", "fix");
    const fix = commit(
      root,
      {
        "python/pkg/pyproject.toml": pyproject("0.0.1").replace(
          "dependencies = []",
          'dependencies = ["starlette"]',
        ),
        "python/pkg/src/pkg/__init__.py": "VALUE = 2\n",
      },
      "fix",
    );
    git(root, "checkout", "-q", "-b", "release", base);
    const release = commit(
      root,
      {
        "python/pkg/pyproject.toml": pyproject("0.0.2"),
        "python/pkg/uv.lock": "version = 2\n",
      },
      "release",
    );

    assert.deepEqual(runPythonVersionCheck(root, release, fix), {
      versionChanges: [],
      mixedFiles: [],
    });
    assert.deepEqual(runPythonVersionCheck(root, fix, release), {
      versionChanges: [
        { file: "python/pkg/pyproject.toml", from: "0.0.1", to: "0.0.2" },
      ],
      mixedFiles: [],
    });
  });
});

test("the executable fails a mixed bump and passes a release PR", () => {
  withRepo((root, base) => {
    const mixed = commit(
      root,
      {
        "python/pkg/pyproject.toml": pyproject("0.0.2"),
        "python/pkg/src/pkg/__init__.py": "VALUE = 2\n",
      },
      "fix with a bump",
    );
    const mixedResult = runExecutable(root, {
      BASE_SHA: base,
      HEAD_SHA: mixed,
    });
    assert.equal(mixedResult.status, 1);
    assert.match(
      mixedResult.stderr,
      /python\/pkg\/pyproject\.toml: 0\.0\.1 to 0\.0\.2/,
    );
    assert.match(mixedResult.stderr, /python\/pkg\/src\/pkg\/__init__\.py/);

    git(root, "checkout", "-q", "-b", "release", base);
    const release = commit(
      root,
      {
        "python/pkg/pyproject.toml": pyproject("0.0.2"),
        "python/pkg/uv.lock": "version = 2\n",
      },
      "release",
    );
    const releaseResult = runExecutable(root, {
      BASE_SHA: base,
      HEAD_SHA: release,
    });
    assert.equal(
      releaseResult.status,
      0,
      releaseResult.stdout + releaseResult.stderr,
    );
  });
});

test("an unknown commit fails the executable instead of passing", () => {
  withRepo((root, base) => {
    const result = runExecutable(root, {
      BASE_SHA: "0".repeat(40),
      HEAD_SHA: base,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Failing instead of skipping/);
  });
});
