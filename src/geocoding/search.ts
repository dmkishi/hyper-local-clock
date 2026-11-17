import type { Geocoder, GeocoderResult } from './geocoder';

/** What the search box should show for the text typed so far. */
export type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; results: GeocoderResult[] }
  | { status: 'failed' };

interface SearchOptions {
  /** Milliseconds of quiet before a request goes out. Defaults to 300. */
  delay?: number;
  /** Shortest text worth searching for. Defaults to 3 characters. */
  minLength?: number;
}

interface Search {
  /** Call with the full text on every keystroke. */
  input: (query: string) => void;
  /** Drops a pending or in-flight request. Its answer is never reported. */
  cancel: () => void;
}

/**
 * Search-as-you-type that stays gentle on a free geocoder: it waits for a
 * pause in typing, ignores very short text, answers repeats from memory, and
 * abandons a request once newer text has replaced it.
 */
export function createSearch(
  geocoder: Pick<Geocoder, 'search'>,
  onState: (state: SearchState) => void,
  { delay = 300, minLength = 3 }: SearchOptions = {},
): Search {
  const cache = new Map<string, GeocoderResult[]>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;

  const cancel = (): void => {
    clearTimeout(timer);
    controller?.abort();
    controller = undefined;
  };

  const run = async (query: string, key: string): Promise<void> => {
    const current = new AbortController();
    controller = current;
    let state: SearchState;
    try {
      const results = await geocoder.search(query, current.signal);
      cache.set(key, results);
      state = { status: 'done', results };
    } catch {
      state = { status: 'failed' };
    }
    // Newer text has taken over, and its own request reports for it.
    if (controller === current) onState(state);
  };

  return {
    input(text) {
      cancel();
      const query = text.trim();
      const key = query.toLowerCase();
      if (query.length < minLength) {
        onState({ status: 'idle' });
        return;
      }
      const results = cache.get(key);
      if (results) {
        onState({ status: 'done', results });
        return;
      }
      onState({ status: 'loading' });
      timer = setTimeout(() => {
        void run(query, key);
      }, delay);
    },
    cancel,
  };
}
