const supportsHyperlinks = {
  stdout: false,
  stderr: false,
};

// markdansi 0.3.9 and later import this named export from supports-hyperlinks 5.
export function createSupportsHyperlinks(_stream?: unknown): boolean {
  return false;
}

export default supportsHyperlinks;
