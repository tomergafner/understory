"use client";

import type { CodeExcerpt, Question } from "@/lib/types";

export function ExcerptBlock({
  excerpt,
  commitLabel,
}: {
  excerpt: CodeExcerpt;
  commitLabel: string;
}) {
  const lines = excerpt.code.split("\n");
  return (
    <figure className="overflow-hidden rounded-lg border border-pine-line bg-pine">
      <figcaption className="flex items-baseline justify-between gap-3 border-b border-pine-line px-4 py-2.5">
        <span className="truncate font-code text-[0.72rem] text-cream/80">
          {excerpt.path}
          <span className="ml-2 text-cream-dim/60">
            L{excerpt.startLine}–{excerpt.endLine}
          </span>
        </span>
        <span className="shrink-0 font-code text-[0.65rem] text-cream-dim/50">
          {commitLabel}
        </span>
      </figcaption>
      <pre className="overflow-x-auto px-4 py-3 text-[0.78rem] leading-[1.6] text-cream">
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span className="w-9 shrink-0 select-none pr-3 text-right font-code text-cream-dim/40">
              {excerpt.startLine + i}
            </span>
            <code className="font-code whitespace-pre">{line || " "}</code>
          </div>
        ))}
      </pre>
    </figure>
  );
}

export function AdaptationNote({ message }: { message: string }) {
  return (
    <aside className="anim-rise relative mt-8" aria-label="How your path is adapting">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-moss">
        Adapting your path
      </p>
      <span className="anim-drawline mt-1.5 block h-0.5 w-14 rounded-full bg-fern" />
      <p className="prose-lesson mt-3 italic text-ink-soft">{message}</p>
    </aside>
  );
}

export function ProgressLine({
  percent,
  goalLabel,
  grewNote,
  pendingNote,
}: {
  percent: number;
  goalLabel: string;
  grewNote?: string | null;
  pendingNote?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="whitespace-nowrap text-[0.72rem] text-ink-faint">
        {goalLabel}
      </span>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Curriculum coverage: ${percent} percent`}
        className="h-1 w-28 overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-moss transition-[width] duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="whitespace-nowrap font-code text-[0.72rem] font-medium text-moss-deep">
        {percent}% covered
      </span>
      {grewNote && (
        <span className="whitespace-nowrap text-[0.68rem] text-amber">
          {grewNote}
        </span>
      )}
      {pendingNote && (
        <span className="animate-pulse whitespace-nowrap text-[0.68rem] text-ink-faint">
          {pendingNote}
        </span>
      )}
    </div>
  );
}

export function QuizQuestion({
  question,
  index,
  value,
  onChange,
  result,
  locked = false,
}: {
  question: Question;
  index: number;
  value: string;
  onChange: (v: string) => void;
  result?: boolean; // defined once graded
  locked?: boolean; // grading in flight — answers must not silently change
}) {
  const graded = result !== undefined || locked;
  return (
    <fieldset className="rounded-lg border border-line bg-white/50 p-5">
      <legend className="sr-only">Question {index + 1}</legend>
      <div className="flex items-baseline gap-3">
        <span className="font-code text-[0.7rem] text-ink-faint">
          Q{index + 1}
        </span>
        <p className="text-[0.92rem] font-medium leading-relaxed text-ink">
          {question.prompt}
        </p>
        {result !== undefined && (
          <span
            className={`ml-auto shrink-0 font-code text-[0.7rem] font-medium ${
              result ? "text-moss-deep" : "text-rust"
            }`}
          >
            {result ? "✓ right" : "✗ not quite"}
          </span>
        )}
      </div>

      {question.kind === "mc" && question.options ? (
        <div className="mt-3 flex flex-col gap-1.5" role="radiogroup">
          {question.options.map((opt) => {
            const selected = value === opt.id;
            const isCorrect =
              result !== undefined && opt.id === question.correctOptionId;
            const isWrongPick = result !== undefined && selected && !isCorrect;
            return (
              <label
                key={opt.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md border px-3.5 py-2.5 text-[0.85rem] leading-relaxed transition-colors ${
                  isCorrect
                    ? "border-moss bg-moss/10 text-moss-deep"
                    : isWrongPick
                      ? "border-rust/50 bg-rust/5 text-rust"
                      : selected
                        ? "border-moss bg-moss/5 text-ink"
                        : "border-transparent text-ink-soft hover:border-line hover:bg-white"
                } ${graded ? "cursor-default" : ""}`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={opt.id}
                  checked={selected}
                  disabled={graded}
                  onChange={() => onChange(opt.id)}
                  className="mt-1 accent-[#3e7c4f]"
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <textarea
          value={value}
          disabled={graded}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="A sentence is plenty."
          className="mt-3 w-full rounded-md border border-line bg-white/80 px-3.5 py-2.5 font-display text-[0.95rem] leading-relaxed text-ink placeholder:text-ink-faint/50 focus:border-moss"
        />
      )}
    </fieldset>
  );
}
