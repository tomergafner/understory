"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { LearningJourney } from "./types";

// Phase 4 persistence: Postgres via /api/journeys is the source of truth;
// localStorage is the write-through cache AND the fallback when the server
// is unreachable (the demo must survive external-service failure).
// React subscribes via useSyncExternalStore; the async load kicks off on
// first subscribe (never during render).

const KEY = "understory.v0.journeys";
const SERVER_SNAPSHOT: LearningJourney[] = [];

let cache: LearningJourney[] | null = null;
let loadedAt = 0;
let mode: "server" | "local" = "local";
let loadStarted = false;
const listeners = new Set<() => void>();

function readLocal(): LearningJourney[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LearningJourney[];
  } catch {
    return [];
  }
}

function writeLocal(journeys: LearningJourney[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(journeys));
  } catch {
    // storage blocked/full: the session still works in memory
  }
}

function emit() {
  listeners.forEach((l) => l());
}

async function loadOnce() {
  if (loadStarted) return;
  loadStarted = true;
  loadedAt = Date.now();

  // Journeys are only ever user-created now; drop legacy seeded rows.
  const dropSeeds = (journeys: LearningJourney[]) =>
    journeys.filter((j) => j.id !== "seed-fastapi");

  try {
    const res = await fetch("/api/journeys");
    if (!res.ok) throw new Error(`journeys ${res.status}`);
    const data = (await res.json()) as { journeys: LearningJourney[] };
    mode = "server";
    cache = dropSeeds(data.journeys);
    writeLocal(cache);
  } catch {
    // Server or DB unavailable: fall back to the local cache.
    mode = "local";
    cache = dropSeeds(readLocal());
  }
  emit();
}

function setJourneys(next: LearningJourney[]) {
  cache = next;
  writeLocal(next);
  emit();
}

function pushToServer(journey: LearningJourney) {
  if (mode !== "server") return;
  fetch(`/api/journeys/${journey.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(journey),
  }).catch((err) => {
    console.warn("journey sync failed; continuing locally", err);
    mode = "local";
  });
}

function deleteOnServer(id: string) {
  if (mode !== "server") return;
  fetch(`/api/journeys/${id}`, { method: "DELETE" }).catch((err) => {
    console.warn("journey delete sync failed", err);
    mode = "local";
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void loadOnce();
  return () => {
    listeners.delete(listener);
  };
}

export function useJourneys() {
  const journeys = useSyncExternalStore(
    subscribe,
    () => cache ?? SERVER_SNAPSHOT,
    () => SERVER_SNAPSHOT,
  );
  const ready = useSyncExternalStore(
    subscribe,
    () => cache !== null,
    () => false,
  );
  const now = useSyncExternalStore(
    subscribe,
    () => loadedAt,
    () => 0,
  );

  const upsert = useCallback((journey: LearningJourney) => {
    setJourneys([journey, ...(cache ?? []).filter((j) => j.id !== journey.id)]);
    pushToServer(journey);
  }, []);

  const remove = useCallback((id: string) => {
    setJourneys((cache ?? []).filter((j) => j.id !== id));
    deleteOnServer(id);
  }, []);

  return { journeys, ready, now, upsert, remove };
}

export function sortByLastActive(journeys: LearningJourney[]): LearningJourney[] {
  return [...journeys].sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}
