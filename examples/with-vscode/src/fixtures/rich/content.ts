import { defineFixtures } from "../types";

const svg = (body: string) =>
  `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">${body}</svg>`,
  )}`;

const CHART_IMAGE = svg(
  `<rect width="320" height="180" fill="#1f6feb"/><rect x="40" y="100" width="40" height="50" fill="#8ab4f8"/><rect x="110" y="70" width="40" height="80" fill="#8ab4f8"/><rect x="180" y="40" width="40" height="110" fill="#8ab4f8"/><rect x="250" y="20" width="40" height="130" fill="#8ab4f8"/>`,
);

const NOTES_FILE = `data:text/plain;base64,${btoa("Release notes\n\n- Fetch bridge\n- Theme preset\n")}`;

export default defineFixtures([
  {
    name: "reasoning",
    description: "Reasoning part followed by the answer",
    prompt: "reasoning Think before answering",
    script: () => [
      {
        type: "reasoning",
        text: "The user wants to know which transport the webview uses. The webview cannot call fetch against the backend, so requests must travel over postMessage to the extension host.",
      },
      {
        type: "text",
        text: "The webview tunnels **fetch** over `postMessage`; the extension host runs the route handler and streams the response back.",
      },
    ],
  },
  {
    name: "sources",
    description: "Answer that cites URL sources",
    prompt: "sources Cite your sources",
    script: () => [
      {
        type: "text",
        text: "Webviews run with a strict Content Security Policy and talk to the extension host over postMessage.",
      },
      {
        type: "source",
        id: "src-webview",
        url: "https://code.visualstudio.com/api/extension-guides/webview",
        title: "Webview API",
      },
      {
        type: "source",
        id: "src-csp",
        url: "https://developer.mozilla.org/docs/Web/HTTP/CSP",
        title: "Content Security Policy (CSP)",
      },
      {
        type: "source",
        id: "src-aui",
        url: "https://www.assistant-ui.com/docs",
      },
    ],
  },
  {
    name: "files",
    description: "Image and file parts",
    prompt: "files Attach an image and a file",
    script: () => [
      { type: "text", text: "Here is the chart and the release notes." },
      {
        type: "file",
        mediaType: "image/svg+xml",
        data: CHART_IMAGE,
      },
      {
        type: "file",
        mediaType: "text/plain",
        data: NOTES_FILE,
      },
    ],
  },
]);
