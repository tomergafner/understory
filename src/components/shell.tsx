"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { computeCoverage } from "@/lib/coverage";
import { modelForJourney } from "@/lib/content";
import { sortByLastActive } from "@/lib/store";
import { timeAgo } from "@/lib/time";
import { JourneysProvider, useJourneysCtx } from "./journeys-context";

function Wordmark() {
  return (
    <Link
      href="/"
      className="group flex items-baseline gap-2 px-1 outline-offset-4"
    >
      <span
        className="font-display text-[1.35rem] text-cream tracking-tight"
        style={{ fontVariationSettings: '"SOFT" 60, "WONK" 1' }}
      >
        Understory
      </span>
      <span className="h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-fern transition-transform group-hover:scale-125" />
    </Link>
  );
}

function SidebarJourneys() {
  const { journeys, ready, now } = useJourneysCtx();
  const pathname = usePathname();

  if (!ready) return <div className="flex-1" />;

  const items = sortByLastActive(journeys);

  return (
    <nav aria-label="Recent journeys" className="flex-1 overflow-y-auto">
      <p className="px-3 pb-2 pt-6 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-cream-dim/70">
        Recent journeys
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((j) => {
          const model = modelForJourney(j);
          const { percent } = computeCoverage(model, j.goal, j.learner);
          const href = `/j/${j.id}`;
          const active = pathname === href;
          return (
            <li key={j.id}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex flex-col gap-0.5 rounded-md px-3 py-2 transition-colors ${
                  active
                    ? "bg-pine-soft text-cream"
                    : "text-cream-dim hover:bg-pine-soft/60 hover:text-cream"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-fern" />
                )}
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[0.83rem] font-medium">
                    {j.repoDisplayName}
                  </span>
                  <span className="shrink-0 font-code text-[0.68rem] text-fern/90">
                    {percent}%
                  </span>
                </span>
                <span className="text-[0.68rem] text-cream-dim/60">
                  {timeAgo(now, j.lastActiveAt)}
                </span>
              </Link>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="px-3 py-2 text-[0.78rem] text-cream-dim/60">
            Nothing here yet.
          </li>
        )}
      </ul>
    </nav>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <JourneysProvider>
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-10 flex w-60 flex-col bg-pine px-3 py-5">
          <Wordmark />
          <Link
            href="/"
            className="mt-6 rounded-md border border-pine-line px-3 py-2 text-[0.8rem] font-medium text-cream-dim transition-colors hover:border-moss hover:text-cream"
          >
            + New repository
          </Link>
          <SidebarJourneys />
          <p className="px-3 pt-3 text-[0.65rem] leading-relaxed text-cream-dim/50">
            An adaptive tutor for unfamiliar codebases.
          </p>
        </aside>
        <main className="ml-60 min-h-screen flex-1">{children}</main>
      </div>
    </JourneysProvider>
  );
}
