"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useJourneysCtx } from "@/components/journeys-context";
import { newLiveJourney } from "@/lib/engine";
import { nowMs } from "@/lib/time";
import type { RepositoryModel } from "@/lib/types";

function validateRepoUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return "That doesn't look like a URL yet.";
  }
  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") {
    return "Only public GitHub repositories are supported at the moment.";
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    return "That looks like GitHub, but not a repository — expected github.com/owner/repo.";
  }
  return null;
}

export default function Home() {
  const router = useRouter();
  const { upsert, journeys, startDemo } = useJourneysCtx();
  const [url, setUrl] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  function onDemo() {
    const journey = startDemo();
    router.push(`/j/${journey.id}`);
  }

  async function onLearn(e: React.FormEvent) {
    e.preventDefault();
    const target = url.trim();
    if (!target) {
      setNotice("Paste a GitHub repository URL, or try the demo below.");
      return;
    }
    const error = validateRepoUrl(target);
    if (error) {
      setNotice(error);
      return;
    }

    setAnalyzing(true);
    setNotice(null);
    try {
      // Stage 1 returns a starter curriculum in ~20 seconds; the deep
      // analysis keeps running in the background while learning begins.
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = (await res.json()) as {
        status?: string;
        model?: RepositoryModel;
        message?: string;
      };
      if (!res.ok || !data.model) {
        setNotice(
          data.message ?? "The analysis didn't complete — please try again.",
        );
        return;
      }
      const fresh = newLiveJourney(data.model, "mixed", nowMs());
      // Returning to an already-studied repo resumes it instead of restarting.
      const existing = journeys.find((j) => j.repoId === fresh.repoId);
      const journey = existing ?? fresh;
      if (!existing) upsert(journey);
      router.push(`/j/${journey.id}`);
    } catch {
      setNotice("Something went wrong reaching the analyzer — please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-8 py-16">
      <div className="w-full max-w-xl">
        <h1
          className="anim-rise font-display text-[2.6rem] leading-[1.15] tracking-tight"
          style={{ fontVariationSettings: '"SOFT" 40' }}
        >
          Learn a codebase the way a great teacher would teach it.
        </h1>
        <p
          className="anim-rise mt-4 max-w-lg text-[0.95rem] leading-relaxed text-ink-soft"
          style={{ animationDelay: "80ms" }}
        >
          Paste a public GitHub repository. Understory builds a curriculum from
          the code, teaches in small grounded steps, and adapts to what you
          actually understand — not what you&apos;ve merely read.
        </p>

        <form
          onSubmit={onLearn}
          className="anim-rise mt-9"
          style={{ animationDelay: "160ms" }}
        >
          <label
            htmlFor="repo-url"
            className="text-[0.72rem] font-medium uppercase tracking-[0.13em] text-ink-faint"
          >
            GitHub repository
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="repo-url"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setNotice(null);
              }}
              placeholder="github.com/owner/repository"
              className="min-w-0 flex-1 rounded-lg border border-line bg-white/70 px-4 py-3 font-code text-[0.85rem] text-ink placeholder:text-ink-faint/60 focus:border-moss"
            />
            <button
              type="submit"
              disabled={analyzing}
              className="shrink-0 rounded-lg bg-moss px-5 py-3 text-[0.85rem] font-semibold text-cream transition-colors hover:bg-moss-deep disabled:cursor-wait disabled:opacity-60"
            >
              {analyzing ? "Analyzing…" : "Learn this repo"}
            </button>
          </div>

          {analyzing && (
            <p
              role="status"
              className="anim-fadein mt-4 text-[0.82rem] leading-relaxed text-ink-soft"
            >
              Getting a first read of the repository — your learning path
              starts in about twenty seconds, and a deeper analysis keeps
              working in the background while you learn.
            </p>
          )}

          {notice && (
            <p
              role="status"
              className="anim-fadein mt-4 rounded-md border border-amber/40 bg-amber-soft/60 px-4 py-2.5 text-[0.82rem] text-ink"
            >
              {notice}
            </p>
          )}
        </form>

        <div
          className="anim-rise mt-12 border-t border-line pt-6"
          style={{ animationDelay: "240ms" }}
        >
          <button
            onClick={onDemo}
            disabled={analyzing}
            className="group flex w-full items-center justify-between rounded-lg border border-line bg-white/50 px-5 py-4 text-left transition-colors hover:border-moss disabled:opacity-50"
          >
            <span>
              <span className="block text-[0.85rem] font-medium text-ink">
                Try the demo — expressjs/express
              </span>
              <span className="mt-0.5 block text-[0.78rem] text-ink-soft">
                A two-minute taste of the adaptive loop: lesson, test, and a
                path that changes with your answers.
              </span>
            </span>
            <span className="ml-4 text-moss transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
