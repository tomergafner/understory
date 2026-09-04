"use client";

import { createContext, useContext } from "react";
import { useJourneys } from "@/lib/store";

type JourneysApi = ReturnType<typeof useJourneys>;

const JourneysContext = createContext<JourneysApi | null>(null);

export function JourneysProvider({ children }: { children: React.ReactNode }) {
  const api = useJourneys();
  return (
    <JourneysContext.Provider value={api}>{children}</JourneysContext.Provider>
  );
}

export function useJourneysCtx(): JourneysApi {
  const ctx = useContext(JourneysContext);
  if (!ctx) throw new Error("useJourneysCtx must be used inside JourneysProvider");
  return ctx;
}
