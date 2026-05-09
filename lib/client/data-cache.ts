"use client";

import { useCallback, useEffect, useState } from "react";

type CacheEntry<T> = {
  data: T;
  updatedAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const invalidatedAt = new Map<string, number>();
const listeners = new Map<string, Set<() => void>>();

const defaultStaleMs = 30_000;

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

function subscribe(key: string, listener: () => void) {
  const existing = listeners.get(key) ?? new Set<() => void>();
  existing.add(listener);
  listeners.set(key, existing);

  return () => {
    existing.delete(listener);
    if (!existing.size) {
      listeners.delete(key);
    }
  };
}

export function getCachedData<T>(key: string) {
  return cache.get(key)?.data as T | undefined;
}

export function setCachedData<T>(key: string, data: T) {
  cache.set(key, { data, updatedAt: Date.now() });
  notify(key);
}

export function mutateCachedData<T>(key: string, updater: (data: T | undefined) => T | undefined) {
  const next = updater(getCachedData<T>(key));
  if (next !== undefined) {
    setCachedData(key, next);
  }
}

export function invalidateCachedData(keys: string[]) {
  const now = Date.now();
  for (const key of keys) {
    invalidatedAt.set(key, now);
    notify(key);
  }
}

async function fetchCachedJson<T>(key: string, url: string) {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const request = fetch(url, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Request failed: ${url}`);
      }

      const data = (await response.json()) as T;
      setCachedData(key, data);
      invalidatedAt.delete(key);
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}

function shouldRevalidate(key: string, staleMs: number) {
  const entry = cache.get(key);
  if (!entry) return true;

  const invalidated = invalidatedAt.get(key) ?? 0;
  return Date.now() - entry.updatedAt > staleMs || invalidated > entry.updatedAt;
}

export function revalidateCachedJson<T>(key: string, url: string) {
  return fetchCachedJson<T>(key, url).catch(() => getCachedData<T>(key));
}

export function useCachedJson<T>({
  key,
  url,
  fallbackData,
  staleMs = defaultStaleMs,
}: {
  key: string;
  url: string;
  fallbackData: T;
  staleMs?: number;
}) {
  const [data, setData] = useState<T>(() => getCachedData<T>(key) ?? fallbackData);
  const [isLoading, setIsLoading] = useState(() => !getCachedData<T>(key));

  const revalidate = useCallback(async () => {
    if (!getCachedData<T>(key)) {
      setIsLoading(true);
    }

    const next = await fetchCachedJson<T>(key, url).catch(() => undefined);
    if (next !== undefined) {
      setData(next);
    }
    setIsLoading(false);
    return next;
  }, [key, url]);

  useEffect(() => {
    const unsubscribe = subscribe(key, () => {
      const next = getCachedData<T>(key);
      if (next !== undefined) {
        setData(next);
        setIsLoading(false);
      }

      if (shouldRevalidate(key, staleMs)) {
        void revalidate();
      }
    });

    if (shouldRevalidate(key, staleMs)) {
      queueMicrotask(() => {
        void revalidate();
      });
    }

    return unsubscribe;
  }, [key, revalidate, staleMs]);

  return { data, isLoading, revalidate };
}
