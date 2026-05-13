import { BRIDGE_BOOTSTRAP, COMMON_CSS } from "./common";

export const LANGUAGE_PIE_HTML = /* html */ `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Languages</title>
  <style>
    ${COMMON_CSS}
    .row { display: flex; align-items: center; gap: 16px; }
    svg { flex: 0 0 auto; }
    ul { list-style: none; padding: 0; margin: 0; flex: 1; }
    li { display: grid; grid-template-columns: 12px 1fr auto; align-items: center; gap: 8px; padding: 3px 0; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .pct { color: #888; font-variant-numeric: tabular-nums; }
  </style>
</head>
<body>
  <h2 id="title">Languages</h2>
  <div class="row">
    <svg id="pie" width="180" height="180" viewBox="-100 -100 200 200"></svg>
    <ul id="legend"></ul>
  </div>
  <script>
    const PALETTE = [
      "#3178c6", "#f1e05a", "#e34c26", "#563d7c", "#dea584",
      "#b07219", "#89e051", "#a270ba", "#dbbd34", "#fa7343",
      "#2c3e50", "#41b883", "#cc342d", "#178600", "#f34b7d",
    ];

    function render(result) {
      const sc = result?.structuredContent;
      const repo = sc?.repo || "";
      document.getElementById("title").textContent =
        "Languages — " + repo;

      const langs = sc?.languages || {};
      const entries = Object.entries(langs).sort((a, b) => b[1] - a[1]);
      const total = entries.reduce((s, [, v]) => s + v, 0);
      if (total === 0) {
        document.getElementById("legend").innerHTML =
          '<li class="pct">No language data</li>';
        return;
      }

      const svg = document.getElementById("pie");
      svg.innerHTML = "";
      let acc = 0;
      entries.forEach(([name, bytes], i) => {
        const frac = bytes / total;
        const start = acc;
        const end = acc + frac;
        acc = end;
        const a0 = start * Math.PI * 2 - Math.PI / 2;
        const a1 = end * Math.PI * 2 - Math.PI / 2;
        const r = 90;
        const x0 = Math.cos(a0) * r, y0 = Math.sin(a0) * r;
        const x1 = Math.cos(a1) * r, y1 = Math.sin(a1) * r;
        const large = frac > 0.5 ? 1 : 0;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d",
          \`M0 0 L \${x0.toFixed(2)} \${y0.toFixed(2)} A \${r} \${r} 0 \${large} 1 \${x1.toFixed(2)} \${y1.toFixed(2)} Z\`);
        path.setAttribute("fill", PALETTE[i % PALETTE.length]);
        svg.appendChild(path);
      });

      const legend = entries
        .map(([name, bytes], i) => {
          const pct = ((bytes / total) * 100).toFixed(1);
          return \`<li>
            <span class="dot" style="background:\${PALETTE[i % PALETTE.length]}"></span>
            <span>\${name}</span>
            <span class="pct">\${pct}%</span>
          </li>\`;
        })
        .join("");
      document.getElementById("legend").innerHTML = legend;
    }
    window.render = render;
  </script>
  ${BRIDGE_BOOTSTRAP}
</body>
</html>`;
