import type {
  ContainerInfo,
  LayoutInfo,
} from "@assistant-ui/remote-components-protocol";

/**
 * Host query containers other than the slot, for `@container` rules
 * (css.ts loads this on demand). Every `@container` rule gets a twin
 * `@media` rule with the same contents, right after it, switched on
 * (`all`) when the host container the rule names matches and off
 * (`not all`) otherwise. Matching is evaluated by the browser itself, on
 * hidden probes with the host container's size, type and the rule's
 * condition. Elements inside the page's own containers still match the
 * original rule natively; the twin adds the host's answer for everything
 * else (and for those, when the host container matches too).
 */
interface Twin {
  rule: CSSMediaRule;
  name: string;
  query: string;
}

export class ContainerTwins {
  private readonly twins = new Map<CSSRule, Twin>();
  private readonly twinRules = new WeakSet<CSSRule>();
  private layout: LayoutInfo | null = null;
  private own = false;
  private probe: HTMLElement | null = null;
  private probeStyle: HTMLStyleElement | null = null;
  private probeKey = "";

  private readonly doc: Document;

  constructor(doc: Document) {
    this.doc = doc;
  }

  setLayout(layout: LayoutInfo | null, ownContainer: boolean): boolean {
    this.layout = layout;
    this.own = ownContainer;
    return this.evaluate();
  }

  /** Adds twins for new @container rules; returns true when anything changed. */
  pass(): boolean {
    let added = false;
    for (const sheet of this.doc.styleSheets)
      if (sheet.ownerNode !== this.probeStyle && this.sheet(sheet))
        added = true;
    for (const rule of this.twins.keys())
      if (rule.parentStyleSheet === null) this.twins.delete(rule);
    return this.evaluate() || added;
  }

  private sheet(sheet: CSSStyleSheet): boolean {
    try {
      return this.rules(sheet.cssRules, sheet);
    } catch {
      return false;
    }
  }

  private rules(
    rules: CSSRuleList,
    parent: CSSStyleSheet | CSSGroupingRule,
  ): boolean {
    let added = false;
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]!;
      if (this.twinRules.has(rule)) continue;
      if (
        "styleSheet" in rule &&
        rule.styleSheet instanceof CSSStyleSheet &&
        this.sheet(rule.styleSheet)
      )
        added = true;
      if (
        "cssRules" in rule &&
        rule.cssRules instanceof CSSRuleList &&
        this.rules(rule.cssRules, rule as CSSGroupingRule)
      )
        added = true;
      if (!("containerName" in rule) || this.twins.has(rule)) continue;
      const c = rule as CSSRule & {
        containerName: string;
        containerQuery?: string;
        conditionText: string;
        cssRules: CSSRuleList;
      };
      const name = c.containerName;
      const query =
        c.containerQuery ?? c.conditionText.replace(name, "").trim();
      const inner = [...c.cssRules].map((r) => r.cssText).join("\n");
      try {
        parent.insertRule(`@media not all {\n${inner}\n}`, i + 1);
      } catch {
        continue;
      }
      const twin = parent.cssRules[i + 1] as CSSMediaRule;
      this.twinRules.add(twin);
      this.twins.set(rule, { rule: twin, name, query });
      i++;
      added = true;
    }
    return added;
  }

  /** Switches each twin on when the host container its rule names matches. */
  private evaluate(): boolean {
    if (this.twins.size === 0) return false;
    const containers = this.layout?.containers ?? [];
    const pick = (name: string): ContainerInfo | null => {
      for (let i = 0; i < containers.length; i++) {
        const c = containers[i]!;
        if (name !== "" && !c.name.split(/\s+/).includes(name)) continue;
        // The slot itself is the container: <body> matches natively.
        return i === 0 && this.own ? null : c;
      }
      return null;
    };
    const list = [...this.twins.values()].map((t) => ({ t, c: pick(t.name) }));
    const results = this.test(
      list
        .filter((e): e is { t: Twin; c: ContainerInfo } => e.c !== null)
        .map((e) => ({ query: e.t.query, c: e.c })),
    );
    let changed = false;
    for (const { t, c } of list) {
      const text =
        c !== null && results.get(key(t.query, c)) === true ? "all" : "not all";
      if (t.rule.media.mediaText !== text) {
        t.rule.media.mediaText = text;
        changed = true;
      }
    }
    return changed;
  }

  private test(
    list: { query: string; c: ContainerInfo }[],
  ): Map<string, boolean> {
    const out = new Map<string, boolean>();
    const body = this.doc.body;
    if (list.length === 0 || body === null) return out;
    const unique = [
      ...new Map(list.map((x) => [key(x.query, x.c), x])).entries(),
    ];
    if (this.probe === null) {
      this.probe = this.doc.createElement("rc-probe");
      this.probe.setAttribute("aria-hidden", "true");
      this.probe.style.cssText =
        "position:absolute!important;left:0;top:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none;contain:strict";
      this.probeStyle = this.doc.createElement("style");
    }
    if (!this.probe.isConnected) body.append(this.probe);
    if (!this.probeStyle!.isConnected)
      (this.doc.head ?? this.doc.documentElement).append(this.probeStyle!);
    const probeKey = unique.map(([k]) => k).join("\n");
    if (probeKey !== this.probeKey) {
      this.probeKey = probeKey;
      this.probe.textContent = "";
      let css = "";
      unique.forEach(([, x], i) => {
        const box = this.doc.createElement("div");
        box.style.cssText = `container:rc-probe-${i}/${x.c.type};width:${x.c.width}px;height:${x.c.height ?? 0}px;position:absolute`;
        const leaf = this.doc.createElement("i");
        leaf.dataset.rcProbe = String(i);
        box.append(leaf);
        this.probe!.append(box);
        css += `@container rc-probe-${i} ${x.query}{[data-rc-probe="${i}"]{--rc-hit:1}}\n`;
      });
      this.probeStyle!.textContent = css;
    }
    const win = this.doc.defaultView!;
    unique.forEach(([k], i) => {
      const leaf = this.probe!.querySelector(`[data-rc-probe="${i}"]`);
      out.set(
        k,
        leaf !== null &&
          win.getComputedStyle(leaf).getPropertyValue("--rc-hit").trim() ===
            "1",
      );
    });
    return out;
  }

  dispose(): void {
    this.probe?.remove();
    this.probeStyle?.remove();
  }
}

function key(query: string, c: ContainerInfo): string {
  return `${query}\0${c.type}:${c.width}x${c.height}`;
}
