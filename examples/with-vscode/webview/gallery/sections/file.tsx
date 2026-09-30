import { File } from "@assistant-ui/ui/components/assistant-ui/elements/file.tsx";
import { defineSections } from "../types";
import { TONE_WAV } from "./_assets";

const NOTES = `data:text/plain;base64,${btoa("Release notes\n\n- Fetch bridge\n- Theme preset\n")}`;

export default defineSections([
  {
    id: "file",
    title: "File",
    category: "content",
    notes:
      "Standalone parts: a data: text file with its size, a URL PDF, an id-sourced file, and a file name longer than the card.",
    render: () => (
      <div className="flex flex-col gap-2">
        <File
          type="file"
          filename="release-notes.txt"
          mimeType="text/plain"
          data={NOTES}
          status={{ type: "complete" }}
        />
        <File
          type="file"
          filename="webview-csp.pdf"
          mimeType="application/pdf"
          data="https://example.com/webview-csp.pdf"
          sourceType="url"
          status={{ type: "complete" }}
        />
        <File
          type="file"
          filename="dataset.csv"
          mimeType="text/csv"
          data="file_01HZX8"
          sourceType="id"
          status={{ type: "complete" }}
        />
        <File
          type="file"
          filename="a-very-long-generated-report-name-for-the-extension-host-bridge-benchmark-2026-09-30.json"
          mimeType="application/json"
          data={NOTES}
          status={{ type: "complete" }}
        />
      </div>
    ),
  },
  {
    id: "file-audio",
    title: "File (audio part)",
    category: "content",
    notes:
      "An audio/wav data: URL renders the kit's AudioPlayer. The CSP has no media-src, so default-src 'none' governs <audio>.",
    render: () => (
      <File
        type="file"
        filename="tone.wav"
        mimeType="audio/wav"
        data={TONE_WAV}
        status={{ type: "complete" }}
      />
    ),
  },
]);
