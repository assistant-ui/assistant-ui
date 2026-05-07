import { useEffect, useRef } from 'react';
import { useThreadRuntime } from '@assistant-ui/react';

interface Props {
  initialPrompt: string | null;
  onSent?: (() => void) | undefined;
}

export function InitialMessageSender({ initialPrompt, onSent }: Props) {
  const threadRuntime = useThreadRuntime();
  const sentRef = useRef<string | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!initialPrompt) {
      console.log('[InitialMessageSender] No initial prompt, skipping');
      return;
    }

    if (sentRef.current === initialPrompt) {
      console.log('[InitialMessageSender] Already sent this prompt, skipping');
      return;
    }

    const attemptSend = () => {
      attemptRef.current += 1;
      const attempt = attemptRef.current;

      console.log(`[InitialMessageSender] Attempt ${attempt} - Sending message:`, initialPrompt.slice(0, 50));

      try {
        threadRuntime.append({
          role: 'user',
          content: [{ type: 'text', text: initialPrompt }],
        });

        sentRef.current = initialPrompt;
        console.log(`[InitialMessageSender] Message sent successfully on attempt ${attempt}`);
        onSent?.();
      } catch (error) {
        console.error(`[InitialMessageSender] Attempt ${attempt} failed:`, error);

        if (attempt < 5) {
          const delay = Math.min(500 * attempt, 2000);
          console.log(`[InitialMessageSender] Retrying in ${delay}ms...`);
          setTimeout(attemptSend, delay);
        } else {
          console.error('[InitialMessageSender] Max retries reached, giving up');
        }
      }
    };

    const timeoutId = setTimeout(attemptSend, 0);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [initialPrompt, threadRuntime, onSent]);

  useEffect(() => {
    attemptRef.current = 0;
  }, [initialPrompt]);

  return null;
}
