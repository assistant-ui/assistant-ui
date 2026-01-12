import express from "express";
import { createHash } from "crypto";
import { readFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { generateBridgeScript } from "@assistant-ui/tool-ui-server";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = join(__dirname, "assets");
const PORT = process.env.PORT || 4444;

function injectBridgeScript(html) {
  const bridgeScript = generateBridgeScript();
  const scriptTag = `<script>${bridgeScript}</script>`;

  if (html.includes("</head>")) {
    return html.replace("</head>", `${scriptTag}</head>`);
  } else if (html.includes("<body>")) {
    return html.replace("<body>", `<body>${scriptTag}`);
  }
  return scriptTag + html;
}

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

const WIDGET_CONFIGS = {
  "pizzaz-node": {
    serverName: "Pizzaz (Node)",
    components: [
      { name: "PizzaMap", toolNames: ["pizza-map"], file: "pizzaz" },
      {
        name: "PizzaCarousel",
        toolNames: ["pizza-carousel"],
        file: "pizzaz-carousel",
      },
      {
        name: "PizzaAlbums",
        toolNames: ["pizza-albums"],
        file: "pizzaz-albums",
      },
      { name: "PizzaList", toolNames: ["pizza-list"], file: "pizzaz-list" },
      { name: "PizzaShop", toolNames: ["pizza-shop"], file: "pizzaz-shop" },
    ],
  },
  "pizzaz-python": {
    serverName: "Pizzaz (Python)",
    components: [
      { name: "PizzaMap", toolNames: ["pizza-map"], file: "pizzaz" },
      {
        name: "PizzaCarousel",
        toolNames: ["pizza-carousel"],
        file: "pizzaz-carousel",
      },
      {
        name: "PizzaAlbums",
        toolNames: ["pizza-albums"],
        file: "pizzaz-albums",
      },
      { name: "PizzaList", toolNames: ["pizza-list"], file: "pizzaz-list" },
      { name: "PizzaShop", toolNames: ["pizza-shop"], file: "pizzaz-shop" },
    ],
  },
  "kitchen-sink-node": {
    serverName: "Kitchen Sink (Node)",
    components: [
      {
        name: "KitchenSink",
        toolNames: ["kitchen-sink-show", "kitchen-sink-refresh"],
        file: "kitchen-sink-lite",
      },
    ],
  },
  "kitchen-sink-python": {
    serverName: "Kitchen Sink (Python)",
    components: [
      {
        name: "KitchenSink",
        toolNames: ["kitchen-sink-show", "kitchen-sink-refresh"],
        file: "kitchen-sink-lite",
      },
    ],
  },
  "solar-system-python": {
    serverName: "Solar System",
    components: [
      {
        name: "SolarSystem",
        toolNames: ["solar-system"],
        file: "solar-system",
      },
    ],
  },
  "shopping-cart-python": {
    serverName: "Shopping Cart",
    components: [
      {
        name: "ShoppingCart",
        toolNames: ["shopping-cart"],
        file: "shopping-cart",
      },
    ],
  },
  "todo-app": {
    serverName: "Todo App",
    components: [{ name: "TodoApp", toolNames: ["todo-app"], file: "todo" }],
  },
};

import { readdirSync } from "fs";

function findAssetFile(baseName) {
  const exact = join(ASSETS_DIR, `${baseName}.html`);
  if (existsSync(exact)) return exact;

  const files = readdirSync(ASSETS_DIR);
  const match = files.find(
    (f) => f.startsWith(`${baseName}-`) && f.endsWith(".html"),
  );
  if (match) return join(ASSETS_DIR, match);

  return null;
}

function computeBundleHash(serverId) {
  const config = WIDGET_CONFIGS[serverId];
  if (!config) return "sha256:" + "0".repeat(64);

  let content = "";
  for (const comp of config.components) {
    const htmlPath = join(ASSETS_DIR, `${comp.file}.html`);
    if (existsSync(htmlPath)) {
      content += readFileSync(htmlPath, "utf8");
    }
  }

  if (!content) return "sha256:" + "0".repeat(64);

  const hash = createHash("sha256").update(content).digest("hex");
  return `sha256:${hash}`;
}

app.get("/v1/servers/:serverId/manifest.json", (req, res) => {
  const { serverId } = req.params;
  const config = WIDGET_CONFIGS[serverId];

  if (!config) {
    return res.status(404).json({ error: `Unknown server: ${serverId}` });
  }

  const bundleHash = computeBundleHash(serverId);

  const manifest = {
    version: "1.0",
    serverId,
    serverName: config.serverName,
    bundleUrl: `http://localhost:${PORT}/bundle.js`,
    bundleHash,
    components: config.components.map((c) => ({
      name: c.name,
      toolNames: c.toolNames,
      visibility: "visible",
      defaultDisplayMode: "inline",
    })),
    permissions: {
      network: true,
      storage: false,
      clipboard: false,
      callTools: true,
      displayMode: true,
      followUpMessages: false,
      modals: false,
    },
  };

  res.json(manifest);
});

app.get("/render", (req, res) => {
  const { component, serverId } = req.query;

  const config = WIDGET_CONFIGS[serverId];
  if (!config) {
    return res.status(404).send("Unknown server");
  }

  const comp = config.components.find((c) => c.name === component);
  if (!comp) {
    return res.status(404).send("Unknown component");
  }

  const htmlFile = join(ASSETS_DIR, `${comp.file}.html`);
  if (!existsSync(htmlFile)) {
    return res.status(404).send(`Widget HTML not found: ${comp.file}.html`);
  }

  res.sendFile(`${comp.file}.html`, { root: ASSETS_DIR });
});

app.get("/bundle.js", (req, res) => {
  res.type("application/javascript");
  res.send("// Placeholder bundle - widgets are loaded via /render endpoint");
});

// Serve HTML files with bridge script injection
app.get("/:filename.html", (req, res, next) => {
  const filePath = join(ASSETS_DIR, req.params.filename + ".html");
  if (existsSync(filePath)) {
    const html = readFileSync(filePath, "utf8");
    res.type("text/html");
    return res.send(injectBridgeScript(html));
  }
  next();
});

// Serve other static files (JS, CSS, etc.) without modification
app.use(express.static(ASSETS_DIR, { extensions: false, redirect: false }));

// SPA fallback for React Router widgets
// When a widget uses BrowserRouter and navigates to /pizzaz-9252/place/123,
// we need to serve the widget's HTML file for client-side routing to work
const WIDGET_BASES = [
  "pizzaz",
  "pizzaz-carousel",
  "pizzaz-albums",
  "pizzaz-list",
  "pizzaz-shop",
  "kitchen-sink-lite",
  "solar-system",
  "shopping-cart",
  "todo",
  "mixed-auth-search",
  "mixed-auth-past-orders",
];

app.get("/{*path}", (req, res, next) => {
  const path = req.path.replace(/^\//, "");
  // Check if path starts with any widget base name (with optional hash suffix)
  const matchingWidget = WIDGET_BASES.find((base) => {
    // Match exact base or base-HASH pattern (e.g., pizzaz-9252)
    const pattern = new RegExp(`^${base}(-[a-f0-9]+)?(\\/|$)`);
    return pattern.test(path);
  });

  if (matchingWidget) {
    const htmlFile = findAssetFile(matchingWidget);
    if (htmlFile && existsSync(htmlFile)) {
      const html = readFileSync(htmlFile, "utf8");
      res.type("text/html");
      return res.send(injectBridgeScript(html));
    }
  }

  next();
});

app.listen(PORT, () => {
  console.log(`Assets server running at http://localhost:${PORT}`);
  console.log(`  Manifest: GET /v1/servers/:serverId/manifest.json`);
  console.log(`  Render:   GET /render?serverId=...&component=...`);
  console.log(`  Assets:   Static files from ${ASSETS_DIR}`);
});
