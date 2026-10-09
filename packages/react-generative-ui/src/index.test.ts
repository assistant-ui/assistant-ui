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

describe("@assistant-ui/react-generative-ui", () => {
  it.each([
    [".", index, upstreamReact],
    [". (react-server)", indexServer, upstreamReact],
    ["./ir", ir, upstreamRoot],
    ["./a2ui", a2ui, upstreamA2ui],
    ["./slack", slack, upstreamSlack],
    ["./teams", teams, upstreamTeams],
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
});
