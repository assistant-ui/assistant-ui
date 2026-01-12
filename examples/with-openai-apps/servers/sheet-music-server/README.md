# Example: Sheet Music Server

A demo MCP App that renders [ABC notation](https://en.wikipedia.org/wiki/ABC_notation) as sheet music with interactive audio playback using the [abcjs](https://www.abcjs.net/) library.

<table>
  <tr>
    <td><a href="https://modelcontextprotocol.github.io/ext-apps/screenshots/sheet-music-server/01-twinkle-twinkle-little-star.png"><img src="https://modelcontextprotocol.github.io/ext-apps/screenshots/sheet-music-server/01-twinkle-twinkle-little-star.png" alt="Twinkle, Twinkle Little Star" width="100%"></a></td>
    <td><a href="https://modelcontextprotocol.github.io/ext-apps/screenshots/sheet-music-server/02-playing-on-repeat.png"><img src="https://modelcontextprotocol.github.io/ext-apps/screenshots/sheet-music-server/02-playing-on-repeat.png" alt="Playing on repeat" width="100%"></a></td>
  </tr>
</table>

## Features

- **Audio Playback**: Built-in audio player with play/pause and loop controls
- **Sheet Music Rendering**: Displays ABC notation as properly formatted sheet music

## Running

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build and start the server:

   ```bash
   npm run start:http  # for Streamable HTTP transport
   # OR
   npm run start:stdio  # for stdio transport
   ```

3. View using the [`basic-host`](https://github.com/modelcontextprotocol/ext-apps/tree/main/examples/basic-host) example or another MCP Apps-compatible host.

### Tool Input

When calling the `play-sheet-music` tool, provide ABC notation:

```json
{
  "abcNotation": "X:1\nT:C Major Scale\nM:4/4\nL:1/4\nK:C\nC D E F | G A B c |"
}
```

#### ABC Notation Examples

**C Major Scale:**

```abc
X:1
T:C Major Scale
M:4/4
L:1/4
K:C
C D E F | G A B c |
```

**Twinkle, Twinkle Little Star:**

```abc
X:1
T:Twinkle, Twinkle Little Star
M:4/4
L:1/4
K:C
C C G G | A A G2 | F F E E | D D C2 |
G G F F | E E D2 | G G F F | E E D2 |
C C G G | A A G2 | F F E E | D D C2 |
```

## Architecture

### Server (`server.ts`)

Exposes a single `play-sheet-music` tool that accepts:

- `abcNotation`: ABC notation string to render

The tool validates the ABC notation server-side using the abcjs parser and returns any parse errors. The actual rendering happens client-side when the UI receives the tool input.

### App (`src/mcp-app.ts`)

- Receives ABC notation via `ontoolinput` handler
- Uses abcjs for audio playback controls and sheet music rendering (in `renderAbc()`)
