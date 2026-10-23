const isControl = (code: number) =>
  (code < 0x20 && code !== 0x09 && code !== 0x0a) ||
  (code >= 0x7f && code <= 0x9f);

export const sanitizeTerminalText = (value: string): string => {
  let start = 0;
  while (start < value.length && !isControl(value.charCodeAt(start))) start++;
  if (start === value.length) return value;

  let result = value.slice(0, start);

  for (let i = start; i < value.length;) {
    let code = value.charCodeAt(i);
    if (code === 0x1b || (code >= 0x90 && code <= 0x9f)) {
      if (code === 0x1b) {
        i++;
        if (i >= value.length) break;
        code = value.charCodeAt(i);
        if (
          code === 0x5b ||
          code === 0x5d ||
          code === 0x50 ||
          code === 0x58 ||
          code === 0x5e ||
          code === 0x5f
        ) {
          i++;
        } else {
          while (
            i < value.length &&
            value.charCodeAt(i) >= 0x20 &&
            value.charCodeAt(i) <= 0x2f
          )
            i++;
          if (
            i < value.length &&
            value.charCodeAt(i) >= 0x30 &&
            value.charCodeAt(i) <= 0x7e
          )
            i++;
          continue;
        }
      } else {
        i++;
      }

      if (code === 0x5b || code === 0x9b) {
        while (i < value.length) {
          const next = value.charCodeAt(i++);
          if (next >= 0x40 && next <= 0x7e) break;
        }
      } else if (
        code === 0x5d ||
        code === 0x50 ||
        code === 0x58 ||
        code === 0x5e ||
        code === 0x5f ||
        code === 0x90 ||
        code === 0x98 ||
        code === 0x9d ||
        code === 0x9e ||
        code === 0x9f
      ) {
        while (i < value.length) {
          const next = value.charCodeAt(i++);
          if (
            next === 0x9c ||
            (next === 0x07 && (code === 0x5d || code === 0x9d))
          )
            break;
          if (next === 0x1b && value.charCodeAt(i) === 0x5c) {
            i++;
            break;
          }
        }
      }
      continue;
    }

    if (
      (code < 0x20 && code !== 0x09 && code !== 0x0a) ||
      (code >= 0x7f && code <= 0x9f)
    ) {
      i++;
      continue;
    }
    result += value[i++];
  }

  return result;
};
