export const UI_CSS = `*,
*::before,
*::after {
  box-sizing: border-box;
}
button,
input,
select {
  font: inherit;
  color: inherit;
}
button {
  height: 28px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  cursor: pointer;
  white-space: nowrap;
}
button:hover {
  background: var(--color-surface-muted);
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--focus-ring, var(--color-accent));
  outline-offset: 2px;
}
button.primary {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: var(--color-accent-text);
}
button.primary:hover {
  opacity: 0.9;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
input:not([type="radio"]):not([type="checkbox"]) {
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  min-width: 0;
}
.muted {
  color: var(--color-text-muted);
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.mono {
  font-family: var(--font-mono);
  font-size: 0.875em;
}
.surface {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
}
.menu {
  padding: 4px;
  display: grid;
}
.menu button {
  border: 0;
  background: transparent;
  text-align: left;
  border-radius: calc(var(--radius-md) - 4px);
}
.menu button:hover,
.menu button:focus-visible {
  background: var(--color-surface-muted);
  outline: none;
}
.radios {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  padding: 0;
  border: 0;
}
.radios legend {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
.radios label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.radios input {
  margin: 0;
  accent-color: var(--color-accent);
}
input[type="radio"]:focus-visible {
  outline: 2px solid var(--focus-ring, var(--color-accent));
  outline-offset: 2px;
}`;

type RemotePage = {
  file: string;
  source: string;
  ui?: boolean;
};

export const REMOTE_PAGES = {
  rsvp: {
    file: "widgets/rsvp.html",
    source: `<!-- No doctype, no build step. The serving layer adds the doctype and the runtime. -->
<style>
  .event { font-weight: 600; }
  .when { color: var(--color-text-muted); }
  .row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  button { font: inherit; color: inherit; height: 28px; padding: 0 10px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-surface); cursor: pointer; }
  button:hover { background: var(--color-surface-muted); }
  button:focus-visible { outline: 2px solid var(--focus-ring, var(--color-accent)); outline-offset: 2px; }
</style>

<div><span class="event">Team lunch</span> <span class="when">Friday, 12:30</span></div>
<div class="row">
  <button value="yes">Going</button>
  <button value="no">Can't make it</button>
</div>

<script>
  const render = ({ event = "Team lunch", when = "Friday, 12:30" }) => {
    document.querySelector(".event").textContent = event;
    document.querySelector(".when").textContent = when;
  };
  render(rc.props);
  rc.addEventListener("props-changed", () => render(rc.props));
  for (const button of document.querySelectorAll("button")) {
    button.onclick = () => rc.props.onReply(button.value);
  }
</script>`,
  },
  stars: {
    file: "widgets/stars.html",
    source: `<!doctype html>
<html>
  <head>
    <style>
      .stars { display: flex; gap: 2px; }
      button { font: inherit; font-size: 20px; line-height: 1; width: 32px; height: 32px; padding: 0; border: 0; border-radius: var(--radius-sm); background: none; color: var(--color-text); cursor: pointer; }
      button:hover { background: var(--color-surface-muted); }
      button:focus-visible { outline: 2px solid var(--focus-ring, var(--color-accent)); outline-offset: 0; }
    </style>
  </head>
  <body>
    <div class="stars"></div>
    <script>
      const box = document.querySelector(".stars");

      function render() {
        const value = rc.props.value ?? 0;
        box.replaceChildren(
          ...[1, 2, 3, 4, 5].map((n) => {
            const button = document.createElement("button");
            button.textContent = n <= value ? "★" : "☆";
            button.ariaLabel = \`\${n} of 5\`;
            button.ariaPressed = String(n === value);
            button.onclick = () => rc.props.onRate(n);
            return button;
          }),
        );
      }

      render();
      rc.addEventListener("props-changed", render);
    </script>
  </body>
</html>`,
  },
  centered: {
    file: "widgets/centered.html",
    source: `<!doctype html>
<html>
  <head>
    <!-- Written for a browser window: full height, content in the middle. -->
    <style>
      body { min-height: 100vh; display: grid; place-items: center; }
      .card { display: grid; gap: 4px; padding: 12px 16px; border: 1px solid var(--color-border); border-radius: var(--radius-md); text-align: center; }
      .muted { color: var(--color-text-muted); }
    </style>
  </head>
  <body>
    <div class="card">
      <strong>Payment received</strong>
      <span class="muted">$240.00 from Acme Inc.</span>
    </div>
  </body>
</html>`,
  },
  counter: {
    file: "widgets/counter.html",
    ui: true,
    source: `<button id="count"></button>
<script>
  const button = document.querySelector("#count");
  let n = 0;
  const render = () => (button.textContent = \`\${rc.props.label ?? "Clicks"}: \${n}\`);
  render();
  rc.addEventListener("props-changed", render);
  button.onclick = () => {
    n += 1;
    render();
    void rc.props.onChange?.(n);
  };
</script>`,
  },
  slots: {
    file: "widgets/slots.html",
    ui: true,
    source: `<div class="row" style="gap: 6px"></div>

<template id="slot-menu">
  <div class="surface menu" role="menu" style="min-width: 140px"></div>
  <script>
    const list = document.querySelector(".menu");
    function render() {
      const { slots = [], selected = null, onPick } = rc.props;
      list.replaceChildren(
        ...slots.map((slot) => {
          const item = document.createElement("button");
          item.role = "menuitemradio";
          item.ariaChecked = String(slot === selected);
          item.textContent = slot === selected ? \`\${slot} ✓\` : slot;
          item.onclick = () => onPick(slot);
          return item;
        }),
      );
    }
    render();
    rc.addEventListener("props-changed", render);
  </script>
</template>

<script>
  const row = document.querySelector(".row");
  const more = document.createElement("button");
  more.textContent = "More";
  more.ariaExpanded = "false";
  let menu = null;

  const closeMenu = () => {
    menu?.close();
    menu = null;
    more.ariaExpanded = "false";
  };
  const menuProps = () => ({
    slots: rc.props.more ?? [],
    selected: rc.props.selected ?? null,
    onPick: async (slot) => {
      closeMenu();
      await rc.props.onPick(slot);
    },
  });

  more.onclick = () => {
    if (menu) return closeMenu();
    more.ariaExpanded = "true";
    menu = rc.overlay({
      kind: "popover",
      html: document.querySelector("#ui").outerHTML + document.querySelector("#slot-menu").innerHTML,
      anchor: more,
      placement: { side: "bottom", align: "end" },
      props: menuProps(),
      onDismiss: () => {
        menu = null;
        more.ariaExpanded = "false";
      },
    });
  };

  function render() {
    const { slots = [], selected = null, onPick } = rc.props;
    row.replaceChildren(
      ...slots.map((slot) => {
        const button = document.createElement("button");
        button.textContent = slot;
        button.className = slot === selected ? "primary" : "";
        button.ariaPressed = String(slot === selected);
        button.onclick = () => onPick(slot);
        return button;
      }),
      more,
    );
    menu?.update(menuProps());
  }
  render();
  rc.addEventListener("props-changed", render);
</script>`,
  },
  note: {
    file: "widgets/note.html",
    ui: true,
    source: `<div style="font-weight: 500" id="title"></div>
<p class="muted" style="margin: 4px 0 0" id="text"></p>
<script>
  function render() {
    document.querySelector("#title").textContent = rc.props.title ?? "";
    document.querySelector("#text").textContent = rc.props.text ?? "";
  }
  render();
  rc.addEventListener("props-changed", render);
</script>`,
  },
  tags: {
    file: "widgets/tags.html",
    ui: true,
    source: `<style>
  .tag { padding: 2px 8px; border: 1px solid var(--color-border); border-radius: 999px; font-size: 0.875em; }
</style>
<div class="row" style="gap: 4px"></div>
<script>
  const row = document.querySelector(".row");
  function render() {
    row.replaceChildren(
      ...(rc.props.tags ?? []).map((tag) => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = tag;
        return span;
      }),
    );
  }
  render();
  rc.addEventListener("props-changed", render);
</script>`,
  },
  panel: {
    file: "widgets/panel.html",
    ui: true,
    source: `<style>
  .panel {
    height: 100%;
    min-height: 48px;
    display: grid;
    place-items: center;
    border: 1px dashed var(--color-border-strong);
    border-radius: var(--radius-md);
    background: var(--color-surface-muted);
  }
</style>
<div class="panel"><span class="muted"></span></div>
<script>
  const render = () => (document.querySelector(".panel span").textContent = rc.props.title ?? "Panel");
  render();
  rc.addEventListener("props-changed", render);
</script>`,
  },
  greeting: {
    file: "widgets/greeting.html",
    ui: true,
    source: `<div class="row">
  <span>Hello, <span id="who">there</span>.</span>
  <button id="like">Like</button>
  <span class="muted" id="likes"></span>
</div>
<script>
  const render = () => (document.querySelector("#who").textContent = rc.props.name ?? "there");
  render();
  rc.addEventListener("props-changed", render);
  document.querySelector("#like").onclick = async () => {
    const likes = await rc.props.onLike(rc.props.name);
    document.querySelector("#likes").textContent = \`Host says \${likes} likes\`;
  };
</script>`,
  },
  search: {
    file: "widgets/search.html",
    ui: true,
    source: `<div style="display: grid; gap: 8px">
  <div class="row" style="flex-wrap: nowrap">
    <input aria-label="Query" value="ber" style="flex: 1" />
    <button id="search">Search</button>
    <button id="cancel">Cancel</button>
  </div>
  <div class="muted" id="result">Idle</div>
</div>
<script>
  const input = document.querySelector("input");
  const result = document.querySelector("#result");
  let controller = null;

  document.querySelector("#search").onclick = async () => {
    controller?.abort();
    const ac = (controller = new AbortController());
    result.textContent = "Searching…";
    try {
      const cities = await rc.props.onSearch(input.value, { signal: ac.signal });
      result.textContent = cities.length ? cities.join(", ") : "No results";
    } catch (error) {
      result.textContent = ac.signal.aborted ? "Cancelled" : \`Failed: \${error.message}\`;
    }
  };
  document.querySelector("#cancel").onclick = () => controller?.abort();
</script>`,
  },
  slow: {
    file: "widgets/slow.html",
    ui: true,
    source: `<div>Loaded at <span id="at"></span>.</div>
<script>
  document.querySelector("#at").textContent = new Date().toLocaleTimeString();
</script>`,
  },
  crashy: {
    file: "widgets/crashy.html",
    ui: true,
    source: `<div class="row">
  <span>Running.</span>
  <button id="throw">Throw</button>
  <button id="reject">Reject a promise</button>
</div>
<script>
  document.querySelector("#throw").onclick = () => {
    throw new Error("Thrown in a click handler");
  };
  document.querySelector("#reject").onclick = () => {
    void Promise.reject(new Error("Rejected on purpose"));
  };
</script>`,
  },
  "theme-card": {
    file: "widgets/theme-card.html",
    ui: true,
    source: `<!-- No colors or fonts of its own: everything comes from the host. -->
<div style="display: grid; gap: 8px">
  <div style="font-weight: 600">Invoice #1042</div>
  <div class="muted">Due in 14 days. Color scheme: <span id="scheme"></span>.</div>
  <div class="row">
    <button class="primary">Pay now</button>
    <button>Download</button>
  </div>
</div>
<script>
  // CSS follows the host by itself. Script that reads computed styles re-reads them on theme-changed.
  const show = () =>
    (document.querySelector("#scheme").textContent =
      getComputedStyle(document.documentElement).colorScheme || "normal");
  show();
  rc.addEventListener("theme-changed", show);
</script>`,
  },
  shipping: {
    file: "widgets/shipping.html",
    ui: true,
    source: `<form class="row">
  <input aria-label="ZIP code" placeholder="ZIP code" name="zip" style="width: 100px" />
  <fieldset class="radios">
    <legend>Speed</legend>
    <label><input type="radio" name="speed" value="Standard" /> Standard</label>
    <label><input type="radio" name="speed" value="Express" checked /> Express</label>
    <label><input type="radio" name="speed" value="Overnight" /> Overnight</label>
  </fieldset>
  <button type="submit">Save</button>
</form>
<script>
  const form = document.querySelector("form");
  form.onsubmit = (event) => {
    event.preventDefault();
    void rc.props.onSave({ zip: form.zip.value, speed: form.speed.value });
  };
</script>`,
  },
  "menu-button": {
    file: "widgets/menu-button.html",
    ui: true,
    source: `<button id="sort" aria-haspopup="menu" aria-expanded="false">Sort: Newest</button>

<template id="menu">
  <div class="surface menu" role="menu" style="min-width: 160px"></div>
  <script>
    const list = document.querySelector(".menu");
    function render() {
      list.replaceChildren(
        ...(rc.props.items ?? []).map((item) => {
          const button = document.createElement("button");
          button.role = "menuitem";
          button.textContent = item;
          button.onclick = () => rc.props.onSelect(item);
          return button;
        }),
      );
    }
    render();
    rc.addEventListener("props-changed", render);
  </script>
</template>

<script>
  const sort = document.querySelector("#sort");
  let menu = null;

  const closeMenu = () => {
    menu?.close();
    menu = null;
    sort.ariaExpanded = "false";
  };

  sort.onclick = () => {
    if (menu) return closeMenu();
    sort.ariaExpanded = "true";
    menu = rc.overlay({
      kind: "popover",
      html: document.querySelector("#ui").outerHTML + document.querySelector("#menu").innerHTML,
      anchor: sort,
      placement: { side: "bottom", align: "start" },
      props: {
        items: ["Newest", "Oldest", "Most viewed"],
        onSelect: (item) => {
          sort.textContent = \`Sort: \${item}\`;
          closeMenu();
        },
      },
      onDismiss: () => {
        menu = null;
        sort.ariaExpanded = "false";
      },
    });
  };
</script>`,
  },
  "dialog-button": {
    file: "widgets/dialog-button.html",
    ui: true,
    source: `<div class="row">
  <button id="rename">Rename…</button>
  <span class="muted" id="result"></span>
</div>

<template id="confirm">
  <!-- Dialog content. The host draws the backdrop, traps focus and handles Escape. -->
  <form class="surface" style="padding: 16px; width: 320px; max-width: 100%; display: grid; gap: 12px">
    <div style="font-weight: 600">Rename project</div>
    <input aria-label="Project name" name="project" />
    <div class="row" style="justify-content: flex-end">
      <button type="button" id="cancel">Cancel</button>
      <button type="submit" class="primary">Save</button>
    </div>
  </form>
  <script>
    const form = document.querySelector("form");
    rc.addEventListener("props-changed", () => (form.project.value = rc.props.initial ?? ""), { once: true });
    form.onsubmit = (event) => {
      event.preventDefault();
      void rc.props.onSave(form.project.value);
    };
    document.querySelector("#cancel").onclick = () => void rc.props.onCancel();
  </script>
</template>

<script>
  const result = document.querySelector("#result");
  document.querySelector("#rename").onclick = () => {
    const dialog = rc.overlay({
      kind: "dialog",
      label: "Rename project",
      html: document.querySelector("#ui").outerHTML + document.querySelector("#confirm").innerHTML,
      props: {
        initial: "Atlas",
        onSave: (name) => {
          result.textContent = \`Renamed to \${name}\`;
          dialog.close();
        },
        onCancel: () => dialog.close(),
      },
      onDismiss: (reason) => (result.textContent = \`Dismissed (\${reason})\`),
    });
  };
</script>`,
  },
  weather: {
    file: "widgets/weather.html",
    ui: true,
    source: `<div style="display: grid; gap: 8px">
  <div class="row" style="justify-content: space-between">
    <span style="font-weight: 500">Berlin</span>
    <span id="reading" style="font-variant-numeric: tabular-nums"></span>
  </div>
  <div id="error" style="color: var(--color-danger)" hidden></div>
  <div class="row"><button id="load">Get weather</button></div>
</div>
<script>
  const FORECAST = "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m";
  const button = document.querySelector("#load");
  const reading = document.querySelector("#reading");
  const error = document.querySelector("#error");

  async function load() {
    button.disabled = true;
    button.textContent = "Loading…";
    error.hidden = true;
    try {
      const res = await fetch(FORECAST);
      if (!res.ok) throw new Error(\`Open-Meteo answered \${res.status}\`);
      const { current } = await res.json();
      reading.textContent = \`\${current.temperature_2m.toFixed(1)}°C, wind \${current.wind_speed_10m.toFixed(0)} km/h\`;
    } catch (e) {
      reading.textContent = "";
      error.textContent = navigator.onLine ? \`Blocked: \${e.message}\` : "You are offline.";
      error.hidden = false;
    }
    button.disabled = false;
    button.textContent = "Refresh";
  }

  button.onclick = load;
  // Retry by itself when the connection comes back.
  addEventListener("online", () => {
    if (!error.hidden) void load();
  });
</script>`,
  },
  probe: {
    file: "widgets/probe.html",
    ui: true,
    source: `<!-- Tries to reach the host page and the network, and reports what happened. -->
<div style="display: grid; gap: 2px">
  <div class="muted mono" style="margin-bottom: 6px">origin: <span id="origin"></span></div>
  <div id="results" style="display: grid; gap: 2px"></div>
</div>
<script>
  document.querySelector("#origin").textContent = self.origin;
  const results = document.querySelector("#results");

  function show(label, outcome, reached) {
    const row = document.createElement("div");
    row.className = "row";
    row.style.cssText = "justify-content: space-between; flex-wrap: nowrap";
    const value = document.createElement("span");
    value.className = "mono";
    value.style.color = reached ? "var(--color-danger)" : "var(--color-text-muted)";
    value.textContent = outcome;
    row.append(label, value);
    results.append(row);
  }

  function check(label, reach) {
    try {
      if (reach()) show(label, "Reached", true);
      else show(label, "Not visible", false);
    } catch (e) {
      show(label, \`Blocked (\${e.name})\`, false);
    }
  }

  rc.addEventListener(
    "props-changed",
    async () => {
      const { hostCookie, hostStorageKey } = rc.props;
      check("Host page DOM", () => window.parent.document.body !== null);
      check("Host URL", () => window.top.location.href.length > 0);
      check("Host cookie", () => document.cookie.includes(\`\${hostCookie}=\`));
      check("Host localStorage", () => localStorage.getItem(hostStorageKey) !== null);
      try {
        await fetch("https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0");
        show("Public API", "Reached", true);
      } catch {
        show("Public API", "Blocked by CSP", false);
      }
    },
    { once: true },
  );
</script>`,
  },
} satisfies Record<string, RemotePage>;

export type RemotePageName = keyof typeof REMOTE_PAGES;

export function remotePage(name: RemotePageName): string {
  const page: RemotePage = REMOTE_PAGES[name];
  return page.ui
    ? `<style id="ui">\n${UI_CSS}\n</style>\n${page.source}`
    : page.source;
}

export const GENERATED_HTML = `<style>
  table { border-collapse: collapse; width: 100%; }
  td { padding: 4px 0; border-bottom: 1px solid var(--color-border); }
  td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
</style>
<strong>Q3 revenue</strong>
<table>
  <tr><td>Europe</td><td>$1.24M</td></tr>
  <tr><td>Americas</td><td>$980K</td></tr>
  <tr><td>Asia</td><td>$610K</td></tr>
</table>
<p>
  <button value="Break it down by month">By month</button>
  <button value="Compare with Q2">Compare with Q2</button>
</p>
<script>
  for (const button of document.querySelectorAll("button")) {
    button.onclick = () => rc.props.onAsk(button.value);
  }
</script>`;
