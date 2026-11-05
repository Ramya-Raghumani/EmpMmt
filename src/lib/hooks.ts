import { useCallback, useEffect, useRef, useState } from 'react';

const DATA_EVENT = 'campusleave:data-changed';

/** Fired after a mutation so every mounted screen (and the bell) refreshes. */
export function emitDataChanged(): void {
  window.dispatchEvent(new Event(DATA_EVENT));
}

export function useDataChanged(handler: () => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const listener = () => ref.current();
    window.addEventListener(DATA_EVENT, listener);
    return () => window.removeEventListener(DATA_EVENT, listener);
  }, []);
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'Something went wrong. Please try again.';
}

/**
 * Small data-loading helper. `key` encodes the inputs that should trigger a
 * reload; the shared data-changed event plus `reload()` cover mutations.
 */
export function useAsync<T>(loader: () => Promise<T>, initial: T, key = '') {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loaderRef
      .current()
      .then((value) => {
        if (!active) return;
        setData(value);
        setError(null);
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key, nonce]);

  useDataChanged(reload);

  return { data, loading, error, reload, setData };
}

/** Simple debounce used by the search boxes. */
export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
