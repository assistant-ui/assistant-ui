import type { ServerEvent } from './types';

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'error';

export function parseSseDataLine(line: string): ServerEvent | null {
  if (!line.startsWith('data: ')) return null;
  try {
    return JSON.parse(line.slice(6)) as ServerEvent;
  } catch {
    return null;
  }
}

export function shouldReloadStateAfterReconnect({
  wasReconnect,
  lastEventId,
  firstEventAfterReconnect,
}: {
  wasReconnect: boolean;
  lastEventId: string | null;
  firstEventAfterReconnect: ServerEvent | null;
}): boolean {
  if (!wasReconnect) return false;
  if (!lastEventId) return false;
  return !firstEventAfterReconnect;
}
