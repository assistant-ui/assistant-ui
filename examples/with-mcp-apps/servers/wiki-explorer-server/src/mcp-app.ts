/**
 * Wiki Explorer - Force-directed graph visualization of Wikipedia link networks
 */
import { App, type McpUiHostContext } from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
} from "d3-force-3d";
import ForceGraph, { type LinkObject, type NodeObject } from "force-graph";
import "./global.css";
import "./mcp-app.css";

// Helper to resolve CSS variables for canvas rendering
function getCSSColor(varName: string): string {
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue(varName)
      .trim() || "#000"
  );
}

// Types
type NodeState = "default" | "expanded" | "error";

interface NodeData extends NodeObject {
  url: string;
  title: string;
  state: NodeState;
  errorMessage?: string;
}

interface LinkData extends LinkObject {
  source: string | NodeData;
  target: string | NodeData;
}

interface GraphData {
  nodes: NodeData[];
  links: LinkData[];
}

type PageInfo = { url: string; title: string };
type ToolResponse = {
  page: PageInfo;
  links: PageInfo[];
  error: string | null;
};

// Graph state
const graphData: GraphData = { nodes: [], links: [] };
let selectedNodeUrl: string | null = null;
let initialUrl: string | null = null;

// DOM elements
const container = document.getElementById("graph")!;
const popup = document.getElementById("popup")!;
const popupTitle = popup.querySelector(".popup-title")!;
const popupError = popup.querySelector(".popup-error")! as HTMLElement;
const openBtn = document.getElementById("open-btn")!;
const expandBtn = document.getElementById("expand-btn")!;
const zoomInBtn = document.getElementById("zoom-in")!;
const zoomOutBtn = document.getElementById("zoom-out")!;
const resetBtn = document.getElementById("reset-graph")!;

// Initialize force-graph
const graph = new ForceGraph<NodeData, LinkData>(container)
  .nodeId("url")
  .nodeLabel("title")
  .nodeColor((node: NodeData) => {
    switch (node.state) {
      case "expanded":
        return getCSSColor("--node-expanded");
      case "error":
        return getCSSColor("--node-error");
      default:
        return getCSSColor("--node-default");
    }
  })
  .nodeVal(8)
  .linkDirectionalArrowLength(6)
  .linkDirectionalArrowRelPos(1)
  .linkColor(() => getCSSColor("--link-color"))
  .onNodeClick(handleNodeClick)
  .onBackgroundClick(() => hidePopup())
  // Configure forces for better node spreading
  .d3Force("charge", forceManyBody().strength(-80))
  .d3Force("link", forceLink().distance(60))
  .d3Force("collide", forceCollide(12))
  .d3Force("center", forceCenter())
  .d3VelocityDecay(0.3)
  .cooldownTime(Infinity)
  .d3AlphaMin(0)
  .d3Force("ambient", () => {
    for (const node of graphData.nodes) {
      if (node.vx !== undefined && node.vy !== undefined) {
        node.vx += (Math.random() - 0.5) * 0.1;
        node.vy += (Math.random() - 0.5) * 0.1;
      }
    }
  })
  .graphData(graphData);

// Handle window resize
function handleResize() {
  const { width, height } = container.getBoundingClientRect();
  graph.width(width).height(height);
}
window.addEventListener("resize", handleResize);
handleResize();

// Node management functions
function addNode(
  url: string,
  title: string,
  state: NodeState = "default",
  initialPos?: { x: number; y: number },
): boolean {
  const existing = graphData.nodes.find((n) => n.url === url);
  if (existing) {
    return false;
  }
  const node: NodeData = { url, title, state };
  if (initialPos) {
    // Small random jitter so nodes don't stack exactly
    node.x = initialPos.x + (Math.random() - 0.5) * 20;
    node.y = initialPos.y + (Math.random() - 0.5) * 20;
  }
  graphData.nodes.push(node);
  return true;
}

function updateNodeTitle(url: string, title: string): void {
  const node = graphData.nodes.find((n) => n.url === url);
  if (node) {
    node.title = title;
  }
}

function setNodeState(
  url: string,
  state: NodeState,
  errorMessage?: string,
): void {
  const node = graphData.nodes.find((n) => n.url === url);
  if (node) {
    node.state = state;
    node.errorMessage = errorMessage;
  }
}

function addEdge(sourceUrl: string, targetUrl: string): boolean {
  const existing = graphData.links.find((l) => {
    const src =
      typeof l.source === "string" ? l.source : (l.source as NodeData).url;
    const tgt =
      typeof l.target === "string" ? l.target : (l.target as NodeData).url;
    return src === sourceUrl && tgt === targetUrl;
  });
  if (existing) {
    return false;
  }
  graphData.links.push({ source: sourceUrl, target: targetUrl });
  return true;
}

function updateGraph(): void {
  graph.graphData({ nodes: [...graphData.nodes], links: [...graphData.links] });
}

// Popup management
function showPopup(node: NodeData, x: number, y: number): void {
  popupTitle.textContent = node.title;

  if (node.state === "error") {
    popupError.textContent = node.errorMessage || "Failed to load page";
    popupError.style.display = "block";
    expandBtn.style.display = "none";
  } else {
    popupError.style.display = "none";
    expandBtn.style.display = "inline-block";

    if (node.state === "expanded") {
      expandBtn.setAttribute("disabled", "true");
      expandBtn.textContent = "Expanded";
    } else {
      expandBtn.removeAttribute("disabled");
      expandBtn.textContent = "Expand";
    }
  }

  popup.style.display = "block";
  const rect = popup.getBoundingClientRect();
  const gap = 15;

  // Place popup on opposite side of cursor from screen center
  const left =
    x < window.innerWidth / 2
      ? x + gap // cursor on left half → popup to right
      : x - rect.width - gap; // cursor on right half → popup to left

  const top =
    y < window.innerHeight / 2
      ? y + gap // cursor on top half → popup below
      : y - rect.height - gap; // cursor on bottom half → popup above

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

function hidePopup(): void {
  popup.style.display = "none";
  selectedNodeUrl = null;
}

// Event handlers
function handleNodeClick(node: NodeData, event: MouseEvent): void {
  // Toggle popup if clicking same node
  if (selectedNodeUrl === node.url) {
    hidePopup();
    return;
  }
  selectedNodeUrl = node.url;
  showPopup(node, event.clientX, event.clientY);
}

// Close popup on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && popup.style.display === "block") {
    hidePopup();
  }
});

// Zoom controls
const ZOOM_FACTOR = 1.5;
zoomInBtn.addEventListener("click", () => {
  const currentZoom = graph.zoom();
  graph.zoom(currentZoom * ZOOM_FACTOR, 200);
});

zoomOutBtn.addEventListener("click", () => {
  const currentZoom = graph.zoom();
  graph.zoom(currentZoom / ZOOM_FACTOR, 200);
});

// Initialize App SDK
const app = new App({ name: "Wiki Explorer", version: "1.0.0" });

// Reset button - clears graph and reloads from initial URL
resetBtn.addEventListener("click", async () => {
  if (!initialUrl) return;

  // Fetch fresh data first, then clear and repopulate
  const result = await app.callServerTool({
    name: "get-first-degree-links",
    arguments: { url: initialUrl },
  });

  // Clear current graph and repopulate with result
  graphData.nodes = [];
  graphData.links = [];
  addNode(initialUrl, initialUrl, "default", { x: 0, y: 0 });
  graph.warmupTicks(100);
  handleToolResultData(result);
  graph.centerAt(0, 0, 500);
});

// Open button - opens the Wikipedia page in browser
openBtn.addEventListener("click", async () => {
  if (selectedNodeUrl) {
    await app.openLink({ url: selectedNodeUrl });
    hidePopup();
  }
});

// Expand button - fetches and displays linked pages
expandBtn.addEventListener("click", async () => {
  if (!selectedNodeUrl) return;

  const sourceUrl = selectedNodeUrl;
  expandBtn.setAttribute("disabled", "true");
  expandBtn.textContent = "Loading...";

  try {
    const result = await app.callServerTool({
      name: "get-first-degree-links",
      arguments: { url: sourceUrl },
    });

    graph.warmupTicks(0);
    handleToolResultData(result);
  } catch (e) {
    console.error("Expand error:", e);
    setNodeState(sourceUrl, "error", "Request failed");
    updateGraph();
  } finally {
    expandBtn.removeAttribute("disabled");
    expandBtn.textContent = "Expand";
    hidePopup();
  }
});

// Handle tool input - create initial node with URL as placeholder title
app.ontoolinput = (params) => {
  const args = params.arguments as { url?: string } | undefined;
  if (args?.url) {
    initialUrl = args.url; // Store for reset functionality
    addNode(args.url, args.url, "default", { x: 0, y: 0 });
    graph.warmupTicks(100);
    updateGraph();
    // Center on the new node
    graph.centerAt(0, 0, 500);
  }
};

// Handle tool result - update node and add linked pages (host-initiated, initial load)
app.ontoolresult = (result) => {
  graph.warmupTicks(100);
  handleToolResultData(result);
};

function handleToolResultData(result: CallToolResult): void {
  if (
    result.isError ||
    !result.content?.[0] ||
    result.content[0].type !== "text"
  ) {
    console.error("Tool result error:", result);
    return;
  }

  try {
    const response: ToolResponse = JSON.parse(result.content[0].text);
    const { page, links, error } = response;

    // Ensure the source node exists
    addNode(page.url, page.title);
    updateNodeTitle(page.url, page.title);

    if (error) {
      setNodeState(page.url, "error", error);
    } else {
      // Get source node position so new nodes appear nearby
      const sourceNode = graphData.nodes.find((n) => n.url === page.url);
      const sourcePos = sourceNode
        ? { x: sourceNode.x ?? 0, y: sourceNode.y ?? 0 }
        : undefined;

      // Add all linked nodes and edges
      for (const link of links) {
        addNode(link.url, link.title, "default", sourcePos);
        addEdge(page.url, link.url);
      }
      setNodeState(page.url, "expanded");
    }

    updateGraph();
  } catch (e) {
    console.error("Failed to parse tool result:", e);
  }
}

app.onerror = (err) => {
  console.error("[Wiki Explorer] App error:", err);
};

function handleHostContextChanged(ctx: McpUiHostContext) {
  if (ctx.safeAreaInsets) {
    document.body.style.paddingTop = `${ctx.safeAreaInsets.top}px`;
    document.body.style.paddingRight = `${ctx.safeAreaInsets.right}px`;
    document.body.style.paddingBottom = `${ctx.safeAreaInsets.bottom}px`;
    document.body.style.paddingLeft = `${ctx.safeAreaInsets.left}px`;
  }
}

app.onhostcontextchanged = handleHostContextChanged;

// Connect to host
app.connect().then(() => {
  const ctx = app.getHostContext();
  if (ctx) {
    handleHostContextChanged(ctx);
  }
});
