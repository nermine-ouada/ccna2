"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MatchPair } from "@/lib/types";

const NODE_PALETTE = [
  "border-violet-400 bg-violet-200 text-violet-900",
  "border-amber-400 bg-amber-200 text-amber-900",
  "border-rose-400 bg-rose-200 text-rose-900",
  "border-sky-400 bg-sky-200 text-sky-900",
  "border-lime-500 bg-lime-200 text-lime-900",
  "border-fuchsia-400 bg-fuchsia-200 text-fuchsia-900"
] as const;

function letterForIndex(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

type MatchPairAnswerReviewProps = {
  pairs: MatchPair[];
  title?: string;
};

type LineSeg = { x1: number; y1: number; x2: number; y2: number; key: string };

export default function MatchPairAnswerReview({
  pairs,
  title = "Réponse : appariements (libellé → description)"
}: MatchPairAnswerReviewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const leftAnchors = useRef(new Map<number, HTMLDivElement>());
  const rightAnchors = useRef(new Map<number, HTMLDivElement>());
  const [lines, setLines] = useState<LineSeg[]>([]);

  const setLeftAnchor = useCallback((i: number) => (el: HTMLDivElement | null) => {
    if (el) leftAnchors.current.set(i, el);
    else leftAnchors.current.delete(i);
  }, []);

  const setRightAnchor = useCallback((i: number) => (el: HTMLDivElement | null) => {
    if (el) rightAnchors.current.set(i, el);
    else rightAnchors.current.delete(i);
  }, []);

  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rr = root.getBoundingClientRect();
    if (rr.width < 1 || rr.height < 1) return;
    const next: LineSeg[] = [];
    pairs.forEach((_, i) => {
      const la = leftAnchors.current.get(i);
      const ra = rightAnchors.current.get(i);
      if (!la || !ra) return;
      const a = la.getBoundingClientRect();
      const b = ra.getBoundingClientRect();
      next.push({
        x1: a.left + a.width / 2 - rr.left,
        y1: a.top + a.height / 2 - rr.top,
        x2: b.left + b.width / 2 - rr.left,
        y2: b.top + b.height / 2 - rr.top,
        key: `r-${i}`
      });
    });
    setLines(next);
  }, [pairs]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(root);
    return () => ro.disconnect();
  }, [measure]);

  useLayoutEffect(() => {
    const onWin = () => measure();
    window.addEventListener("resize", onWin);
    return () => window.removeEventListener("resize", onWin);
  }, [measure]);

  const rows = useMemo(() => pairs, [pairs]);

  return (
    <div
      className="rounded-xl border border-emerald-200 bg-emerald-50/95 p-4 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
      role="region"
      aria-label={title}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-300">
        {title}
      </p>

      <div
        ref={rootRef}
        className="relative space-y-3 rounded-lg border border-emerald-100 bg-white/90 p-3 dark:border-emerald-800 dark:bg-slate-900/90"
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible rounded-lg" aria-hidden>
          {lines.map(({ x1, y1, x2, y2, key }) => (
            <line
              key={key}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#059669"
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        </svg>

        <div className="relative z-[1] space-y-3">
          {rows.map(({ left, right }, i) => {
            const pal = NODE_PALETTE[i % NODE_PALETTE.length];
            const letter = letterForIndex(i);
            return (
              <div
                key={`${left}-${right}-${i}`}
                className="flex flex-col items-stretch gap-3 sm:flex-row sm:gap-4"
              >
                <div className="flex min-w-0 flex-1 items-stretch rounded-xl border border-emerald-100 bg-white shadow-sm dark:border-emerald-800 dark:bg-slate-900">
                  <div className="min-w-0 flex-1 p-3">
                    <p className="text-sm font-medium leading-snug text-emerald-950 dark:text-emerald-100">{left}</p>
                  </div>
                  <div className="flex w-11 shrink-0 items-center justify-center border-l border-emerald-50 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/50">
                    <div
                      ref={setLeftAnchor(i)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${pal}`}
                    >
                      {letter}
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 items-stretch rounded-xl border border-emerald-100 bg-white shadow-sm dark:border-emerald-800 dark:bg-slate-900">
                  <div className="flex w-11 shrink-0 items-center justify-center border-r border-emerald-50 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/50">
                    <div
                      ref={setRightAnchor(i)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${pal}`}
                    >
                      {letter}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 p-3">
                    <p className="text-sm leading-snug text-emerald-900 dark:text-emerald-200">{right}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <ul className="sr-only">
        {pairs.map(({ left, right }) => (
          <li key={`${left}→${right}`}>
            {left} → {right}
          </li>
        ))}
      </ul>
    </div>
  );
}
