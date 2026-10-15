/// <reference types="node" />

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as upstreamRoot from "@assistant-ui/generative-ui";
import * as upstreamA2ui from "@assistant-ui/generative-ui/a2ui";
import * as upstreamReact from "@assistant-ui/generative-ui/react";
import * as upstreamSlack from "@assistant-ui/generative-ui/slack";
import * as upstreamTeams from "@assistant-ui/generative-ui/teams";
import { describe, expect, it } from "vitest";
import * as a2ui from "./a2ui";
import * as index from "./index";
import * as indexServer from "./index.server";
import * as ir from "./ir";
import * as slack from "./slack";
import * as teams from "./teams";

const PACKAGE_DIR = fileURLToPath(new URL("..", import.meta.url));

describe("@assistant-ui/react-generative-ui", () => {
  it.each([
    ["index", index, upstreamReact],
    ["index.server", indexServer, upstreamReact],
    ["ir", ir, upstreamRoot],
    ["a2ui", a2ui, upstreamA2ui],
    ["slack", slack, upstreamSlack],
    ["teams", teams, upstreamTeams],
  ])(
    "%s exports exactly what its @assistant-ui/generative-ui entry exports",
    (_, entry, upstream) => {
      const exported: Record<string, unknown> = { ...entry };
      const expected: Record<string, unknown> = { ...upstream };

      expect(Object.keys(exported).sort()).toEqual(
        Object.keys(expected).sort(),
      );
      for (const name of Object.keys(expected)) {
        expect(exported[name]).toBe(expected[name]);
      }
    },
  );

  it.each([
    [[], ["react-generative-ui/dist/index.js", "generative-ui/dist/react.js"]],
    [
      ["react-server"],
      [
        "react-generative-ui/dist/index.server.js",
        "generative-ui/dist/react.server.js",
      ],
    ],
  ])(
    "resolves the root and @assistant-ui/generative-ui/react under conditions %j",
    (conditions, expected) => {
      const result = spawnSync(
        process.execPath,
        [
          ...conditions.map((condition) => `--conditions=${condition}`),
          "--input-type=module",
          "--eval",
          'for (const id of ["@assistant-ui/react-generative-ui", "@assistant-ui/generative-ui/react"]) console.log(import.meta.resolve(id));',
        ],
        { cwd: PACKAGE_DIR, encoding: "utf8" },
      );

      expect(result.status, result.stderr).toBe(0);
      expect(
        result.stdout
          .trim()
          .split("\n")
          .map((url) => url.split("/").slice(-3).join("/")),
      ).toEqual(expected);
    },
  );
});
