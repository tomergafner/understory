"use client";

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-8">
      <div className="max-w-md text-center">
        <h1 className="font-display text-[1.6rem] tracking-tight">
          Something went sideways.
        </h1>
        <p className="mt-3 text-[0.88rem] leading-relaxed text-ink-soft">
          Your learning progress is saved. Try again — if this keeps happening,
          reload the page.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-moss px-6 py-3 text-[0.88rem] font-semibold text-cream transition-colors hover:bg-moss-deep"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
