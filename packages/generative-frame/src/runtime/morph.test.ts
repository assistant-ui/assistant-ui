import { describe, expect, it, vi } from "vitest";
import {
  createStreamRenderer,
  morphChildren,
  parseMarkup,
  SCRIPT_PLACEHOLDER,
  stripUnclosedStyle,
  type ScriptRunner,
} from "./morph";

const manualSchedule = () => {
  let pending: (() => void) | undefined;
  return {
    schedule: (render: () => void) => {
      pending = render;
      return () => {
        pending = undefined;
      };
    },
    flush: () => {
      const run = pending;
      pending = undefined;
      run?.();
    },
  };
};

const setup = (runScript?: ScriptRunner) => {
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  const scheduler = manualSchedule();
  const renderer = createStreamRenderer({
    root,
    schedule: scheduler.schedule,
    animate: () => {
      return true;
    },
    ...(runScript ? { runScript } : {}),
  });
  return { root, renderer, flush: scheduler.flush };
};

describe("stripUnclosedStyle", () => {
  it("drops a trailing style element that has not closed", () => {
    expect(stripUnclosedStyle("<p>a</p><style>.x{col")).toBe("<p>a</p>");
    expect(stripUnclosedStyle("<style>.x{}</style><p>")).toBe(
      "<style>.x{}</style><p>",
    );
    expect(stripUnclosedStyle("<p>no style</p>")).toBe("<p>no style</p>");
    expect(stripUnclosedStyle("<styled-thing>")).toBe("<styled-thing>");
  });
});

describe("parseMarkup", () => {
  it("auto-closes partial markup and drops a tag cut off mid-way", () => {
    const { fragment } = parseMarkup(
      document,
      '<div class="a"><p>Hel<span cla',
    );
    const div = fragment.firstElementChild!;
    expect(div.outerHTML).toBe('<div class="a"><p>Hel</p></div>');
  });

  it("replaces scripts with placeholders and returns them in document order", () => {
    const { fragment, scripts } = parseMarkup(
      document,
      "<script>1</script><div><script>2</script></div><svg><script>3</script></svg>",
    );
    expect(scripts.map((s) => s.textContent)).toEqual(["1", "2", "3"]);
    expect(fragment.querySelectorAll("script")).toHaveLength(0);
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_COMMENT);
    let count = 0;
    while (walker.nextNode()) {
      expect(walker.currentNode.nodeValue).toBe(SCRIPT_PLACEHOLDER);
      count++;
    }
    expect(count).toBe(3);
  });
});

describe("morphChildren", () => {
  const morph = (live: HTMLElement, html: string) => {
    const added: Node[] = [];
    morphChildren(live, parseMarkup(document, html).fragment, {
      onAdded: (node) => added.push(node),
    });
    return added;
  };

  it("keeps matching nodes and patches text and attributes in place", () => {
    const live = document.createElement("div");
    morph(live, '<h1 class="a">Title</h1><p>Hel</p>');
    const h1 = live.querySelector("h1")!;
    const text = live.querySelector("p")!.firstChild!;

    const added = morph(
      live,
      '<h1 class="b" data-x="1">Title</h1><p>Hello</p><ul><li>one</li></ul>',
    );
    expect(live.querySelector("h1")).toBe(h1);
    expect(h1.getAttribute("class")).toBe("b");
    expect(h1.getAttribute("data-x")).toBe("1");
    expect(live.querySelector("p")!.firstChild).toBe(text);
    expect(text.nodeValue).toBe("Hello");
    expect(added.map((n) => n.nodeName)).toEqual(["UL"]);

    morph(live, '<h1 class="b">Title</h1><p>Hello</p>');
    expect(h1.hasAttribute("data-x")).toBe(false);
    expect(live.querySelector("ul")).toBeNull();
  });

  it("replaces nodes whose tag or id changed", () => {
    const live = document.createElement("div");
    morph(live, '<div id="a">x</div><span>y</span>');
    const span = live.querySelector("span");
    const added = morph(live, '<div id="b">x</div><em>y</em>');
    expect(live.innerHTML).toBe('<div id="b">x</div><em>y</em>');
    expect(added.map((n) => n.nodeName)).toEqual(["DIV", "EM"]);
    expect(span?.isConnected).toBe(false);
  });

  it("keeps later siblings when a single node is inserted or removed", () => {
    const live = document.createElement("div");
    morph(live, "<p>a</p><section>b</section><footer>c</footer>");
    const section = live.querySelector("section");
    const footer = live.querySelector("footer");

    const added = morph(
      live,
      "<p>a</p><aside>new</aside><section>b</section><footer>c</footer>",
    );
    expect(added.map((n) => n.nodeName)).toEqual(["ASIDE"]);
    expect(live.querySelector("section")).toBe(section);

    morph(live, "<p>a</p><section>b</section><footer>c</footer>");
    expect(live.querySelector("aside")).toBeNull();
    expect(live.querySelector("footer")).toBe(footer);
  });

  it("morphs SVG content in its namespace", () => {
    const live = document.createElement("div");
    morph(live, '<svg viewBox="0 0 10 10"><rect width="1"/></svg>');
    const rect = live.querySelector("rect")!;
    morph(
      live,
      '<svg viewBox="0 0 10 10"><rect width="5"/><circle r="2"/></svg>',
    );
    expect(live.querySelector("rect")).toBe(rect);
    expect(rect.getAttribute("width")).toBe("5");
    expect(live.querySelector("circle")!.namespaceURI).toBe(
      "http://www.w3.org/2000/svg",
    );
  });
});

describe("createStreamRenderer", () => {
  it("renders growing partial markup into the same nodes on each frame", () => {
    const { root, renderer, flush } = setup();
    renderer.write("<h3>Rev");
    flush();
    const h3 = root.querySelector("h3")!;
    expect(h3.textContent).toBe("Rev");

    renderer.write('enue</h3><div class="ch');
    renderer.write('art">');
    flush();
    expect(root.querySelector("h3")).toBe(h3);
    expect(h3.textContent).toBe("Revenue");
    expect(root.querySelector("div.chart")).not.toBeNull();
    expect(renderer.source).toBe('<h3>Revenue</h3><div class="chart">');
  });

  it("coalesces writes into one render per scheduled frame", () => {
    const { root, renderer, flush } = setup();
    renderer.write("<p>a");
    renderer.write("b");
    expect(root.innerHTML).toBe("");
    flush();
    expect(root.innerHTML).toBe("<p>ab</p>");
  });

  it("holds a half-written style block until it closes", () => {
    const { root, renderer, flush } = setup();
    renderer.write("<style>.a{color:r");
    flush();
    expect(root.querySelector("style")).toBeNull();
    renderer.write("ed}</style><p class=a>x</p>");
    flush();
    expect(root.querySelector("style")!.textContent).toBe(".a{color:red}");
  });

  it("holds scripts while streaming and runs them in document order on end", async () => {
    const order: string[] = [];
    const runScript: ScriptRunner = async (placeholder, original) => {
      order.push(original.textContent ?? "");
      expect(placeholder.isConnected).toBe(true);
      placeholder.remove();
    };
    const { root, renderer, flush } = setup(runScript);
    renderer.write("<p>a</p><script>first()</script><div>");
    flush();
    expect(order).toEqual([]);
    expect(root.querySelector("script")).toBeNull();
    renderer.write("<script>second()</script></div><script>third(");
    flush();
    expect(order).toEqual([]);
    renderer.write(")</script>");
    await renderer.end();
    expect(order).toEqual(["first()", "second()", "third()"]);
    expect(renderer.ended).toBe(true);
    expect(renderer.scriptsRan).toBe(true);
  });

  it("executes held inline scripts in place with the default runner", async () => {
    const { root, renderer, flush } = setup();
    const out = document.createElement("output");
    document.body.appendChild(out);
    renderer.write(
      '<p id="t">x</p><script>document.querySelector("output").textContent += document.getElementById("t").textContent</script>',
    );
    flush();
    expect(out.textContent).toBe("");
    renderer.write(
      '<script>document.querySelector("output").textContent += "2"</script>',
    );
    const onLoad = vi.fn();
    document.addEventListener("DOMContentLoaded", onLoad);
    await renderer.end();
    document.removeEventListener("DOMContentLoaded", onLoad);
    expect(root.querySelectorAll("script")).toHaveLength(2);
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(out.textContent).toBe("x2");
  });

  it("detects SVG widgets and rejects writes after end", async () => {
    const { root, renderer } = setup(async (p) => p.remove());
    renderer.write('<svg viewBox="0 0 4 4"><rect/></svg>');
    await renderer.end();
    expect(renderer.kind).toBe("svg");
    expect(root.dataset["kind"]).toBe("svg");
    expect(() => renderer.write("more")).toThrow(/replace/);
  });

  it("replace morphs to new complete code", async () => {
    const { root, renderer, flush } = setup(async (p) => p.remove());
    renderer.write("<h3>A</h3><p>old</p>");
    flush();
    const h3 = root.querySelector("h3");
    await renderer.replace("<h3>B</h3><p>new</p><p>more</p>");
    expect(root.querySelector("h3")).toBe(h3);
    expect(root.textContent).toBe("Bnewmore");
    expect(renderer.source).toBe("<h3>B</h3><p>new</p><p>more</p>");
  });
});
