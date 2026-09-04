"use client";

import { useCallback, useEffect, useState } from "react";
import { newDemoJourney, seedFastapiJourney } from "./engine";
import type { LearningJourney } from "./types";

// Phase 1 persistence: localStorage only. Phase 4 replaces this module with
// Postgres-backed persistence behind the same shape.

const KEY = "understory.v0.journeys";

function load(): LearningJourney[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LearningJourney[];
  } catch {
    return [];
  }
}

function save(journeys: LearningJourney[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(journeys));
  } catch {
    // storage full/blocked: the session still works in memory
  }
}

export function useJourneys() {
  const [journeys, setJourneys] = useState<LearningJourney[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stored = load();
    if (!stored.some((j) => j.id === "seed-fastapi")) {
      stored = [...stored, seedFastapiJourney(Date.now())];
      save(stored);
    }
    setJourneys(stored);
    setReady(true);
  }, []);

  const upsert = useCallback((journey: LearningJourney) => {
    setJourneys((prev) => {
      const next = [journey, ...prev.filter((j) => j.id !== journey.id)];
      save(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setJourneys((prev) => {
      const next = prev.filter((j) => j.id !== id);
      save(next);
      return next;
    });
  }, []);

  const startDemo = useCallback((): LearningJourney => {
    const existing = load().find((j) => j.id === "demo-express");
    if (existing) return existing;
    const journey = newDemoJourney(Date.now());
    upsert(journey);
    return journey;
  }, [upsert]);

  return { journeys, ready, upsert, remove, startDemo };
}

export function sortByLastActive(journeys: LearningJourney[]): LearningJourney[] {
  return [...journeys].sort((a, b) => b.lastActiveAt - a.lastActiveAt);
}
