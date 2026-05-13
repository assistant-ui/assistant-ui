import { BRIDGE_BOOTSTRAP, COMMON_CSS } from "./common";

export const COMMIT_HEATMAP_HTML = /* html */ `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Commit activity</title>
  <style>
    ${COMMON_CSS}
    .grid { display: grid; grid-template-columns: repeat(52, 12px); gap: 2px; }
    .day-col { display: grid; grid-template-rows: repeat(7, 12px); gap: 2px; }
    .cell { width: 12px; height: 12px; border-radius: 2px; background: #ebedf0; }
    @media (prefers-color-scheme: dark) {
      .cell { background: #161b22; }
    }
    .legend { display: flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 11px; color: #888; }
    .legend .scale { display: flex; gap: 2px; }
    .legend .scale .cell { width: 10px; height: 10px; }
  </style>
</head>
<body>
  <h2 id="title">Commit activity</h2>
  <div id="grid" class="grid"></div>
  <div class="legend">
    <span>Less</span>
    <div class="scale" id="scale"></div>
    <span>More</span>
    <span class="muted" id="total" style="margin-left:auto"></span>
  </div>
  <script>
    const SHADES = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
    const DARK_SHADES = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];

    function shadeFor(count, max) {
      if (count === 0) return 0;
      const frac = count / max;
      if (frac < 0.25) return 1;
      if (frac < 0.5) return 2;
      if (frac < 0.75) return 3;
      return 4;
    }

    function getShades() {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? DARK_SHADES : SHADES;
    }

    function render(result) {
      const sc = result?.structuredContent;
      const repo = sc?.repo || "";
      const weeks = sc?.weeks || [];
      document.getElementById("title").textContent =
        "Commits — " + repo + " (52-week)";

      const grid = document.getElementById("grid");
      grid.innerHTML = "";

      const max = Math.max(1, ...weeks.flatMap((w) => w.days || []));
      const shades = getShades();
      let total = 0;

      weeks.forEach((week) => {
        const col = document.createElement("div");
        col.className = "day-col";
        for (let d = 0; d < 7; d++) {
          const cell = document.createElement("div");
          cell.className = "cell";
          const c = week.days?.[d] ?? 0;
          total += c;
          cell.style.background = shades[shadeFor(c, max)];
          cell.title = c + " commit" + (c === 1 ? "" : "s");
          col.appendChild(cell);
        }
        grid.appendChild(col);
      });

      const scale = document.getElementById("scale");
      scale.innerHTML = shades.map((c) => \`<div class="cell" style="background:\${c}"></div>\`).join("");
      document.getElementById("total").textContent = total + " commits";
    }
    window.render = render;
  </script>
  ${BRIDGE_BOOTSTRAP}
</body>
</html>`;
