"use client";

import { useCallback, useSyncExternalStore } from "react";
import { newDemoJourney, seedFastapiJourney } from "./engine";
import type { LearningJourney } from "./types";

// Phase 1 persistence: localStorage behind a tiny external store, so React
// subscribes via useSyncExternalStore (server snapshot = empty, no hydration
// mismatch). Phase 4 replaces this module with Postgres-backed persistence.

const KEY = "understory.v0.journeys";
const SERVER_SNAPSHOT: LearningJourney[] = [];

let cache: LearningJourney[] | null = null;
let loadedAt = 0;
const listeners = new Set<() => void>();

function read(): LearningJourney[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LearningJourney[];
  } catch {
    return [];
  }
}

function write(journeys: LearningJourney[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(journeys));
  } catch {
    // storage blocked/full: the session still works in memory
  }
}

function ensureCache(): LearningJourney[] {
  if (cache === null) {
    loadedAt = Date.now();
    let stored = read();
    if (!stored.some((j) => j.id === "seed-fastapi")) {
      stored = [...stored, seedFastapiJourney(loadedAt)];
      write(stored);
    }
    cache = stored;
  }
  return cache;
}

function setJourneys(next: LearningJourney[]) {
  cache = next;
  write(next);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useJourneys() {
  const journeys = useSyncExternalStore(subscribe, ensureCache, () => SERVER_SNAPSHOT);
  const ready = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const now = useSyncExternalStore(
    subscribe,
    () => loadedAt,
    () => 0,
  );

  const upsert = useCallback((journey: LearningJourney) => {
    setJourneys([journey, ...ensureCache().filter((j) => j.id !== journey.id)]);
  }, []);

  const remove = useCallback((id: string) => {
    setJourneys(ensureCache().filter((j) => j.id !== id));
  }, []);

  const startDemo = useCallback((): LearningJourney => {
    const existing = ensureCache().find((j) => j.id === "demo-express");
    if (existing) return existing;
    const journey = newDemoJourney(Date.now());
    setJourneys([journey, ...ensureCache()]);
    return journey;
  }, []);

  return { journeys, ready, now, upsert, remove, startDemo };
}

export function sortByLastActive(journeys: LearningJourney[]): LearningJourney[] {
  return [...journeys].sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}
