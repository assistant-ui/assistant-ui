import { describe, expect, it } from "vitest";
import { defaultGenerativeUILibrary } from "@assistant-ui/react-generative-ui";
import {
  COMPONENT_CATEGORIES,
  COMPONENT_EXAMPLES,
} from "./component-reference";

describe("generative UI component reference", () => {
  it("lists every vocabulary component once in a category and an example", () => {
    const names = Object.keys(defaultGenerativeUILibrary).sort();
    expect(
      COMPONENT_CATEGORIES.flatMap((category) => category.components).sort(),
    ).toEqual(names);
    expect(Object.keys(COMPONENT_EXAMPLES).sort()).toEqual(names);
  });
});
