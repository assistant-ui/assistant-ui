import { createGzip } from 'node:zlib';
import { createWriteStream } from 'node:fs';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { PassThrough } from 'node:stream';
import {
  shouldExcludeRelativePath,
  toRelativeArchivePath,
} from './policy.js';

const BLOCK_SIZE = 512;

function writeString(buffer: Buffer, value: string, offset: number, length: number): void {
  buffer.write(value.slice(0, length), offset, length, 'utf8');
}

function writeOctal(buffer: Buffer, value: number, offset: number, length: number): void {
  const octal = Math.max(0, Math.floor(value)).toString(8);
  const text = octal.padStart(length - 1, '0').slice(-(length - 1)) + '\0';
  buffer.write(text, offset, length, 'ascii');
}

function createTarHeader(options: {
  name: string;
  size: number;
  mode: number;
  mtime: number;
  type: 'file' | 'directory';
}): Buffer {
  const header = Buffer.alloc(BLOCK_SIZE, 0);
  const name = options.type === 'directory' && !options.name.endsWith('/')
    ? `${options.name}/`
    : options.name;
  let headerName = name;
  let headerPrefix = '';

  if (Buffer.byteLength(name) > 100) {
    const parts = name.split('/');
    headerName = parts.pop() ?? name;
    headerPrefix = parts.join('/');
    while (
      (Buffer.byteLength(headerName) > 100 || Buffer.byteLength(headerPrefix) > 155) &&
      headerPrefix.includes('/')
    ) {
      const prefixParts = headerPrefix.split('/');
      headerName = `${prefixParts.pop()}/${headerName}`;
      headerPrefix = prefixParts.join('/');
    }
    if (Buffer.byteLength(headerName) > 100 || Buffer.byteLength(headerPrefix) > 155) {
      throw new Error(`Archive path is too long for ustar header: ${name}`);
    }
  }

  writeString(header, headerName, 0, 100);
  writeOctal(header, options.mode || 0o644, 100, 8);
  writeOctal(header, 0, 108, 8);
  writeOctal(header, 0, 116, 8);
  writeOctal(header, options.size, 124, 12);
  writeOctal(header, options.mtime, 136, 12);
  header.fill(0x20, 148, 156);
  header.write(options.type === 'directory' ? '5' : '0', 156, 1, 'ascii');
  writeString(header, 'ustar', 257, 6);
  writeString(header, '00', 263, 2);
  if (headerPrefix) writeString(header, headerPrefix, 345, 155);

  let checksum = 0;
  for (const byte of header) checksum += byte;
  writeOctal(header, checksum, 148, 8);
  return header;
}

function paddingFor(size: number): Buffer {
  const remainder = size % BLOCK_SIZE;
  return remainder === 0 ? Buffer.alloc(0) : Buffer.alloc(BLOCK_SIZE - remainder, 0);
}

async function writeEntry(output: PassThrough, rootPath: string, fullPath: string): Promise<void> {
  const relativePath = toRelativeArchivePath(rootPath, fullPath);
  if (!relativePath || shouldExcludeRelativePath(relativePath)) return;

  const stat = await lstat(fullPath);
  if (stat.isSymbolicLink()) return;

  if (stat.isDirectory()) {
    output.write(createTarHeader({
      name: relativePath,
      size: 0,
      mode: stat.mode & 0o777,
      mtime: Math.floor(stat.mtimeMs / 1000),
      type: 'directory',
    }));

    const entries = await readdir(fullPath, { withFileTypes: true });
    for (const entry of entries) {
      await writeEntry(output, rootPath, join(fullPath, entry.name));
    }
    return;
  }

  if (!stat.isFile()) return;

  const content = await readFile(fullPath);
  output.write(createTarHeader({
    name: relativePath,
    size: content.length,
    mode: stat.mode & 0o777,
    mtime: Math.floor(stat.mtimeMs / 1000),
    type: 'file',
  }));
  output.write(content);
  output.write(paddingFor(content.length));
}

export async function createTarGzFromDirectory(rootPath: string, destinationPath: string): Promise<void> {
  await mkdir(dirname(destinationPath), { recursive: true });
  const tarStream = new PassThrough();
  const archivePromise = pipeline(
    tarStream,
    createGzip(),
    createWriteStream(destinationPath),
  );

  try {
    const entries = await readdir(rootPath, { withFileTypes: true });
    for (const entry of entries) {
      await writeEntry(tarStream, rootPath, join(rootPath, entry.name));
    }
    tarStream.end(Buffer.alloc(BLOCK_SIZE * 2, 0));
    await archivePromise;
  } catch (error) {
    tarStream.destroy(error as Error);
    await archivePromise.catch(() => {});
    throw error;
  }
}
