const encoder = new TextEncoder();

export type ZipFileMap = Record<string, string | Uint8Array>;

export function createZip(files: ZipFileMap) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  let entryCount = 0;

  for (const [rawName, rawContents] of Object.entries(files).sort()) {
    entryCount += 1;
    const name = normalizeZipPath(rawName);
    const nameBytes = Buffer.from(encoder.encode(name));
    const contents =
      typeof rawContents === "string"
        ? Buffer.from(rawContents, "utf8")
        : Buffer.from(rawContents);
    const crc = crc32(contents);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(contents.length, 18);
    localHeader.writeUInt32LE(contents.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, nameBytes, contents);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(contents.length, 20);
    centralHeader.writeUInt32LE(contents.length, 24);
    centralHeader.writeUInt16LE(nameBytes.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, nameBytes);
    offset += localHeader.length + nameBytes.length + contents.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entryCount, 8);
  end.writeUInt16LE(entryCount, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

export function listZipEntries(zip: Uint8Array) {
  const entries: string[] = [];
  const buffer = Buffer.from(zip);
  let index = buffer.length - 22;

  while (index >= 0 && buffer.readUInt32LE(index) !== 0x06054b50) {
    index -= 1;
  }
  if (index < 0)
    throw new Error("Invalid zip: missing end of central directory.");

  const totalEntries = buffer.readUInt16LE(index + 10);
  let cursor = buffer.readUInt32LE(index + 16);

  for (let i = 0; i < totalEntries; i += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("Invalid zip: missing central directory header.");
    }
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    entries.push(
      buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8"),
    );
    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function normalizeZipPath(path: string) {
  const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("../")) {
    throw new Error(`Unsafe zip path: ${path}`);
  }
  return normalized;
}

let crcTable: Uint32Array | undefined;

function crc32(input: Uint8Array) {
  const table = crcTable ?? (crcTable = createCrcTable());
  let crc = 0xffffffff;
  for (const byte of input) {
    crc = table[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createCrcTable() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let j = 0; j < 8; j += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
}
