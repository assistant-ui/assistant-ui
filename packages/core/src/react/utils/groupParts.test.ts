import { describe, expect, it } from "vitest";
import {
  buildGroupTree,
  groupIdKeysByMember,
  type GroupNode,
} from "./groupParts";

describe("group identity inheritance", () => {
  it.each(Array.from({ length: 32 }, (_, index) => index + 1))(
    "preserves unique sibling keys, shared members for retained identity keys, and stable maps across nested evolutions for seed %i",
    (run) => {
      const paths = [
        [],
        ["group-parts"],
        ["group-parts", "group-leaves"],
        ["group-parts", "group-leaves", "group-deep"],
        ["group-parts", "group-other"],
        ["group-other", "group-leaves"],
        ["group-other", "group-leaves", "group-deep"],
        ['group-"parts', "group-leaves:deep", "group-parts"],
      ];
      let seed = run;
      const random = (limit: number) => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return (seed >>> 0) % limit;
      };
      const members: { id: string | undefined; path: readonly string[] }[] = [];
      let previousKeys: ReadonlyMap<string, string> = new Map();
      let previousGroups = new Map<string, readonly string[]>();
      for (let step = 0; step < 128; step++) {
        const operation = random(5);
        if (members.length === 0 || operation < 2) {
          members.splice(random(members.length + 1), 0, {
            id: operation === 1 ? undefined : `tool-call:t${step}:"`,
            path: paths[random(paths.length)]!,
          });
        } else {
          const index = random(members.length);
          const member = members[index]!;
          if (operation === 2) {
            members.splice(index, 1);
          } else if (operation === 3) {
            members.splice(index, 1);
            members.splice(random(members.length + 1), 0, member);
          } else {
            members[index] = {
              ...member,
              path: paths[random(paths.length)]!,
            };
          }
        }
        const currentPaths = members.map((member) => member.path);
        const ids = members.map(
          (member, index) => member.id ?? `reasoning@${index}`,
        );
        const tree = buildGroupTree(currentPaths, ids, previousKeys);
        const groups = new Map<string, readonly string[]>();
        const context = `seed ${run}, step ${step}`;
        const visit = (
          nodes: readonly GroupNode[],
          ancestorKeys: readonly string[],
        ) => {
          const keys = nodes.map((node) =>
            node.type === "group"
              ? JSON.stringify([node.key, node.idKey ?? node.nodeKey])
              : `part-${node.idKey ?? node.index}`,
          );
          expect(new Set(keys).size, context).toBe(keys.length);
          for (const node of nodes) {
            if (node.type !== "group") continue;
            const chain = [
              ...ancestorKeys,
              JSON.stringify([node.key, node.idKey ?? node.nodeKey]),
            ];
            const position = JSON.stringify(chain);
            const identified = node.indices.flatMap((index) =>
              ids[index]!.includes(":") ? [ids[index]!] : [],
            );
            if (node.idKey !== undefined) {
              const previous = previousGroups.get(position);
              if (previous !== undefined) {
                expect(
                  identified.some((id) => previous.includes(id)),
                  `${context}, group ${position}`,
                ).toBe(true);
              }
              groups.set(position, identified);
            }
            visit(node.children, chain);
          }
        };
        visit(tree, []);
        const keys = groupIdKeysByMember(tree, ids);
        expect(
          groupIdKeysByMember(buildGroupTree(currentPaths, ids, keys), ids),
          context,
        ).toEqual(keys);
        previousKeys = keys;
        previousGroups = groups;
      }
    },
  );
});
