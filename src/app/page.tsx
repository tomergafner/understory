"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useJourneysCtx } from "@/components/journeys-context";

const STYLE_OPTIONS = [
  { id: "mc", label: "Multiple choice" },
  { id: "free", label: "Open questions" },
  { id: "mixed", label: "Mixed" },
] as const;

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
  const { startDemo } = useJourneysCtx();
  const [url, setUrl] = useState("");
  const [style, setStyle] = useState<string>("mixed");
  const [notice, setNotice] = useState<string | null>(null);

  function onLearn(e: React.FormEvent) {
    e.preventDefault();
    const error = validateRepoUrl(url);
    if (error) {
      setNotice(error);
      return;
    }
    if (!url.trim()) {
      setNotice("Paste a GitHub repository URL, or try the demo below.");
      return;
    }
    setNotice(
      "Live repository analysis arrives later in this build. The demo below shows the full learning loop today.",
    );
  }

  function onDemo() {
    const journey = startDemo();
    router.push(`/j/${journey.id}`);
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
              className="shrink-0 rounded-lg bg-moss px-5 py-3 text-[0.85rem] font-semibold text-cream transition-colors hover:bg-moss-deep"
            >
              Learn this repo
            </button>
          </div>

          <fieldset className="mt-5">
            <legend className="text-[0.72rem] font-medium uppercase tracking-[0.13em] text-ink-faint">
              How should we test you?
            </legend>
            <div className="mt-2 flex gap-2" role="radiogroup">
              {STYLE_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-[0.8rem] transition-colors ${
                    style === opt.id
                      ? "border-moss bg-moss/10 font-medium text-moss-deep"
                      : "border-line text-ink-soft hover:border-ink-faint"
                  }`}
                >
                  <input
                    type="radio"
                    name="style"
                    value={opt.id}
                    checked={style === opt.id}
                    onChange={() => setStyle(opt.id)}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

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
            className="group flex w-full items-center justify-between rounded-lg border border-line bg-white/50 px-5 py-4 text-left transition-colors hover:border-moss"
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
