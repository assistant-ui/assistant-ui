import { NAV_ITEMS } from "./constants";

describe("NAV_ITEMS", () => {
  it("keeps Docs first and Pricing last as links", () => {
    expect(NAV_ITEMS[0]).toEqual({
      type: "link",
      label: "Docs",
      href: "/docs",
    });
    expect(NAV_ITEMS.at(-1)).toEqual({
      type: "link",
      label: "Pricing",
      href: "/pricing",
    });
  });

  it("ships only existing products and does not lift Elements or Playground", () => {
    expect(
      NAV_ITEMS.some(
        (item) => item.type === "link" && item.label === "Elements",
      ),
    ).toBe(false);
    expect(
      NAV_ITEMS.some(
        (item) => item.type === "link" && item.label === "Playground",
      ),
    ).toBe(false);

    const products = NAV_ITEMS.find(
      (item) => item.type === "mega" && item.label === "Products",
    );
    expect(products?.type).toBe("mega");
    if (products?.type !== "mega") return;

    expect(products.groups.map((group) => group.label)).toEqual([
      "Extend",
      "Platforms",
      "Hosted",
    ]);
    expect(
      products.groups.flatMap((group) => group.items.map((item) => item.label)),
    ).toEqual([
      "Elements",
      "React",
      "React Native",
      "Ink",
      "Cloud",
      "Playground",
    ]);
  });

  it("keeps Resources to Learn and Company", () => {
    const resources = NAV_ITEMS.find(
      (item) => item.type === "mega" && item.label === "Resources",
    );
    expect(resources?.type).toBe("mega");
    if (resources?.type !== "mega") return;

    expect(resources.groups.map((group) => group.label)).toEqual([
      "Learn",
      "Company",
    ]);
    expect(
      resources.groups
        .find((group) => group.label === "Company")
        ?.items.map((item) => item.label),
    ).toEqual(["Blog", "Careers", "Brand"]);
  });
});
