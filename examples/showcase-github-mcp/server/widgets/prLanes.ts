import { BRIDGE_BOOTSTRAP, COMMON_CSS } from "./common";

export const PR_LANES_HTML = /* html */ `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Open pull requests</title>
  <style>
    ${COMMON_CSS}
    .lanes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .lane h3 { font-size: 12px; margin: 0 0 6px; color: #666; text-transform: uppercase; letter-spacing: 0.04em; }
    .card { padding: 8px 10px; margin-bottom: 6px; border: 1px solid #d0d7de; border-radius: 6px; background: #fff; }
    @media (prefers-color-scheme: dark) {
      .card { background: #161b22; border-color: #30363d; }
    }
    .card a { color: inherit; text-decoration: none; font-weight: 500; }
    .card a:hover { text-decoration: underline; }
    .row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 2px; }
    .num { color: #888; font-size: 11px; }
    .label { font-size: 10px; padding: 1px 6px; border-radius: 10px; border: 1px solid #d0d7de; }
    .draft { color: #888; }
  </style>
</head>
<body>
  <h2 id="title">Open pull requests</h2>
  <div class="lanes">
    <div class="lane">
      <h3>Ready for review</h3>
      <div id="ready"></div>
    </div>
    <div class="lane">
      <h3>Drafts</h3>
      <div id="drafts"></div>
    </div>
  </div>
  <script>
    function escape(s) {
      return String(s).replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]));
    }
    function labelsHtml(labels) {
      if (!labels?.length) return "";
      return labels
        .map((l) => \`<span class="label" style="border-color:#\${l.color || 'd0d7de'}">\${escape(l.name)}</span>\`)
        .join("");
    }
    function cardHtml(pr) {
      return \`<div class="card">
        <a href="\${escape(pr.html_url)}" target="_blank" rel="noopener">\${escape(pr.title)}</a>
        <div class="row">
          <span class="num">#\${pr.number} · \${escape(pr.user?.login || "")}</span>
          \${labelsHtml(pr.labels)}
        </div>
      </div>\`;
    }
    function render(result) {
      const sc = result?.structuredContent;
      const repo = sc?.repo || "";
      const prs = sc?.prs || [];
      document.getElementById("title").textContent =
        "Open pull requests — " + repo;

      const drafts = prs.filter((p) => p.draft);
      const ready = prs.filter((p) => !p.draft);
      const renderInto = (id, list) => {
        const el = document.getElementById(id);
        el.innerHTML = list.length === 0 ? '<div class="muted">None</div>' : list.map(cardHtml).join("");
      };
      renderInto("ready", ready);
      renderInto("drafts", drafts);
    }
    window.render = render;
  </script>
  ${BRIDGE_BOOTSTRAP}
</body>
</html>`;
