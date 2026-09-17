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

for (const failureStage of ["install", "expo-repin", "none"]) {
  test(`${failureStage} outcome preserves the expected dependency updates`, () => {
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
      mkdirSync(path.join(root, "node_modules", "expo"), { recursive: true });
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
              "@expo/vector-icons": "14.1.0",
              "expo-constants": "17.1.7",
              "matrix-only-package": "1.0.0",
              "react-native": "0.81.5",
              "react-native-screens": "4.16.0",
              "react-native-worklets": "0.5.1",
              "unrelated-package": "1.0.0",
            },
            devDependencies: {
              expo: "54.0.0",
            },
          },
          null,
          2,
        ) + "\n",
      );

      writeFileSync(
        path.join(root, "node_modules", "expo", "bundledNativeModules.json"),
        JSON.stringify({ "matrix-only-package": "1.0.0" }) + "\n",
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
  printf '%s\n' "$*" > "$EXPO_CALL_MARKER"
  exit
fi
node -e '
  const fs = require("node:fs");
  const file = "examples/with-expo/package.json";
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  manifest.dependencies["@expo/vector-icons"] = "15.0.0";
  manifest.dependencies["expo-constants"] = "18.0.0";
  manifest.dependencies["matrix-only-package"] = "2.0.0";
  manifest.dependencies["react-native"] = "0.82.0";
  manifest.dependencies["react-native-screens"] = "4.18.0";
  manifest.dependencies["react-native-worklets"] = "0.7.1";
  manifest.dependencies["unrelated-package"] = "2.0.0";
  manifest.devDependencies.expo = "55.0.0";
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
printf 'pnpm %s\n' "$*" >> "$COMPLETION_MARKER"
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
        `#!/bin/sh
printf '%s\n' generate-deps-changeset >> "$COMPLETION_MARKER"
`,
      );
      const result = spawnSync(
        "/bin/bash",
        [path.join(root, "scripts", "update-deps.sh")],
        {
          cwd: root,
          encoding: "utf8",
          env: {
            ...process.env,
            EXPO_CALL_MARKER: path.join(root, "expo-call.txt"),
            COMPLETION_MARKER: path.join(root, "completion.txt"),
            FAILURE_STAGE: failureStage,
            PATH: `${bin}:${process.env.PATH}`,
          },
        },
      );

      if (failureStage === "none") {
        assert.equal(result.status, 0, result.stderr);
        assert.doesNotMatch(result.stderr, /The Expo repin did not run/);
        assert.equal(
          readFileSync(path.join(root, "expo-call.txt"), "utf8"),
          "expo install --fix\n",
        );
      } else {
        assert.equal(result.status, 1, result.stderr);
        assert.match(result.stderr, /The Expo repin did not run/);
        assert.match(result.stderr, /Everything else in this run is complete/);
      }
      assert.match(
        readFileSync(path.join(root, "completion.txt"), "utf8"),
        /pnpm install\npnpm dedupe\ngenerate-deps-changeset/,
      );
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      assert.deepEqual(
        manifest.dependencies,
        failureStage === "none"
          ? {
              "@expo/vector-icons": "15.0.0",
              "expo-constants": "18.0.0",
              "matrix-only-package": "2.0.0",
              "react-native": "0.82.0",
              "react-native-screens": "4.18.0",
              "react-native-worklets": "0.7.1",
              "unrelated-package": "2.0.0",
            }
          : {
              "@expo/vector-icons": "14.1.0",
              "expo-constants": "17.1.7",
              "matrix-only-package": "1.0.0",
              "react-native": "0.81.5",
              "react-native-screens": "4.16.0",
              "react-native-worklets": "0.5.1",
              "unrelated-package": "2.0.0",
            },
      );
      assert.deepEqual(manifest.devDependencies, {
        expo: failureStage === "none" ? "55.0.0" : "54.0.0",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
