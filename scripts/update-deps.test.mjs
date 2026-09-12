import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");

function writeExecutable(file, source) {
  writeFileSync(file, source);
  chmodSync(file, 0o755);
}

for (const failureStage of ["install", "expo-repin"]) {
  test(`${failureStage} failure restores React Native dependencies without reverting unrelated taze updates`, () => {
    const root = mkdtempSync(path.join(tmpdir(), "aui-update-deps-"));
    const bin = path.join(root, "bin");
    const manifestPath = path.join(
      root,
      "examples",
      "with-expo",
      "package.json",
    );

    try {
      mkdirSync(path.dirname(manifestPath), { recursive: true });
      mkdirSync(path.join(root, "scripts"), { recursive: true });
      mkdirSync(bin);
      cpSync(
        path.join(repoRoot, "scripts", "update-deps.sh"),
        path.join(root, "scripts", "update-deps.sh"),
      );

      writeFileSync(
        manifestPath,
        JSON.stringify(
          {
            dependencies: {
              "react-native": "0.81.5",
              "unrelated-package": "1.0.0",
            },
            devDependencies: {
              "@react-native/metro-config": "0.81.5",
            },
          },
          null,
          2,
        ) + "\n",
      );

      writeFileSync(path.join(root, "package.json"), "{}\n");
      writeFileSync(
        path.join(root, "pnpm-lock.yaml"),
        "lockfileVersion: '9.0'\n",
      );

      writeExecutable(
        path.join(bin, "npx"),
        `#!/bin/sh
set -eu
if [ "$1" = "expo" ]; then
  [ "$FAILURE_STAGE" != "expo-repin" ]
  exit
fi
node -e '
  const fs = require("node:fs");
  const file = "examples/with-expo/package.json";
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  manifest.devDependencies["@react-native/metro-config"] = "0.82.0";
  manifest.dependencies["react-native"] = "0.82.0";
  manifest.dependencies["unrelated-package"] = "2.0.0";
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + "\\n");
'
`,
      );
      writeExecutable(
        path.join(bin, "pnpm"),
        `#!/bin/sh
set -eu
case " $* " in
  *" --no-frozen-lockfile "*)
    [ "$FAILURE_STAGE" != "install" ]
    ;;
esac
`,
      );
      writeExecutable(
        path.join(bin, "git"),
        `#!/bin/sh
printf 'package.json\\0examples/with-expo/package.json\\0'
`,
      );
      writeExecutable(
        path.join(root, "scripts", "generate-deps-changeset.sh"),
        "#!/bin/sh\nexit 0\n",
      );
      const result = spawnSync(
        "/bin/bash",
        [path.join(root, "scripts", "update-deps.sh")],
        {
          cwd: root,
          encoding: "utf8",
          env: {
            ...process.env,
            FAILURE_STAGE: failureStage,
            PATH: `${bin}:${process.env.PATH}`,
          },
        },
      );

      assert.equal(result.status, 1, result.stderr);
      assert.match(result.stderr, /The Expo repin did not run/);
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      assert.deepEqual(manifest.dependencies, {
        "react-native": "0.81.5",
        "unrelated-package": "2.0.0",
      });
      assert.deepEqual(manifest.devDependencies, {
        "@react-native/metro-config": "0.81.5",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
