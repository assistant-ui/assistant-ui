import { NAV_ITEMS, STATUS_URL } from "./constants";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("NAV_ITEMS", () => {
  it("opens with Components, then Docs, and keeps Pricing last as links", () => {
    expect(NAV_ITEMS.slice(0, 2)).toEqual([
      { type: "link", label: "Components", href: "/components" },
      { type: "link", label: "Docs", href: "/docs" },
    ]);
    expect(NAV_ITEMS.at(-1)).toEqual({
      type: "link",
      label: "Pricing",
      href: "/pricing",
    });
  });

  it("opens with Docs when the shop is closed", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_URL", "");
    vi.resetModules();
    const closed = await import("./constants");
    expect(closed.NAV_ITEMS[0]).toEqual({
      type: "link",
      label: "Docs",
      href: "/docs",
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

    expect(products.featured?.label).toBe("Extend");
    expect(products.featured?.item.label).toBe("Elements");
    expect(products.featured?.extraItems?.map((item) => item.label)).toEqual([
      "Design",
    ]);

    expect(products.groups.map((group) => group.label)).toEqual([
      "Platforms",
      "Hosted",
      "Primitives",
    ]);
    expect(
      products.groups.flatMap((group) => group.items.map((item) => item.label)),
    ).toEqual([
      "React",
      "React Native",
      "Ink",
      "Vue",
      "Cloud",
      "Playground",
      "tw-shimmer",
      "Heat Graph",
      "Safe Content Frame",
      "react-o11y",
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
    ).toEqual(["Blog", "Careers", "Brand", "Traction", "Status"]);
  });

  it("links Status out to the hosted status page", () => {
    const resources = NAV_ITEMS.find(
      (item) => item.type === "mega" && item.label === "Resources",
    );
    if (resources?.type !== "mega")
      throw new Error("Resources is not a mega item");

    const status = resources.groups
      .flatMap((group) => group.items)
      .find((item) => item.label === "Status");

    expect(status).toMatchObject({ href: STATUS_URL, external: true });
  });
});
