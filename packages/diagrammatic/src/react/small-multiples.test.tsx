import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Line } from "./charts/line";
import { SmallMultiples } from "./small-multiples";

describe("SmallMultiples", () => {
  it("tiles children and names the group", () => {
    const html = renderToStaticMarkup(
      <SmallMultiples title="hosts" columns={3}>
        <Line data={[1, 2, 3]} title="a" />
        <Line data={[3, 2, 1]} title="b" />
        <Line data={[2, 2, 2]} title="c" />
      </SmallMultiples>,
    );
    expect(html).toContain('data-dg-multiples=""');
    expect(html).toContain('aria-label="hosts"');
    expect(html).toContain("repeat(3, minmax(0, 1fr))");
    expect(html.split("<svg").length).toBe(4);
  });
});
