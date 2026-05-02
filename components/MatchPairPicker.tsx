"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent
} from "react";
import type { MatchPair } from "@/lib/types";
import { evaluateMatchPairPicks, type MatchPairPickResult } from "@/lib/questionUi";

const NODE_PALETTE = [
  { node: "border-violet-400 bg-violet-200 text-violet-900", stroke: "#6d28d9" },
  { node: "border-amber-400 bg-amber-200 text-amber-900", stroke: "#d97706" },
  { node: "border-rose-400 bg-rose-200 text-rose-900", stroke: "#e11d48" },
  { node: "border-sky-400 bg-sky-200 text-sky-900", stroke: "#0284c7" },
  { node: "border-lime-500 bg-lime-200 text-lime-900", stroke: "#65a30d" },
  { node: "border-fuchsia-400 bg-fuchsia-200 text-fuchsia-900", stroke: "#c026d3" }
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

type LineSeg = { x1: number; y1: number; x2: number; y2: number; stroke: string; key: string };

type MatchPairPickerProps = {
  /** Correct pairs; used when disabled to draw solution (green) and wrong picks (red). */
  pairs: MatchPair[];
  leftOrder: string[];
  rightChoices: string[];
  picks: Record<string, string>;
  onPick: (left: string, right: string) => void;
  disabled: boolean;
};

export default function MatchPairPicker({
  pairs,
  leftOrder,
  rightChoices,
  picks,
  onPick,
  disabled
}: MatchPairPickerProps) {
  const [activeLeft, setActiveLeft] = useState<string | null>(null);
  const [lines, setLines] = useState<LineSeg[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const leftAnchors = useRef(new Map<string, HTMLDivElement>());
  const rightAnchors = useRef(new Map<string, HTMLDivElement>());

  const setLeftAnchor = useCallback((key: string) => (el: HTMLDivElement | null) => {
    if (el) leftAnchors.current.set(key, el);
    else leftAnchors.current.delete(key);
  }, []);

  const setRightAnchor = useCallback((key: string) => (el: HTMLDivElement | null) => {
    if (el) rightAnchors.current.set(key, el);
    else rightAnchors.current.delete(key);
  }, []);

  const leftIndex = useMemo(() => {
    const m = new Map<string, number>();
    leftOrder.forEach((l, i) => m.set(l, i));
    return m;
  }, [leftOrder]);

  const correctRightByLeft = useMemo(() => {
    const m = new Map<string, string>();
    for (const { left, right } of pairs) m.set(left, right);
    return m;
  }, [pairs]);

  const measureLines = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rr = root.getBoundingClientRect();
    if (rr.width < 1 || rr.height < 1) return;

    const addLine = (leftKey: string, rightKey: string, stroke: string, key: string) => {
      const la = leftAnchors.current.get(leftKey);
      const ra = rightAnchors.current.get(rightKey);
      if (!la || !ra) return;
      const a = la.getBoundingClientRect();
      const b = ra.getBoundingClientRect();
      const x1 = a.left + a.width / 2 - rr.left;
      const y1 = a.top + a.height / 2 - rr.top;
      const x2 = b.left + b.width / 2 - rr.left;
      const y2 = b.top + b.height / 2 - rr.top;
      next.push({ x1, y1, x2, y2, stroke, key });
    };

    const next: LineSeg[] = [];

    if (!disabled) {
      for (const left of leftOrder) {
        const r = picks[left];
        if (r) addLine(left, r, "#0f172a", `u-${left}-${r}`);
      }
    } else {
      for (const { left, right } of pairs) {
        addLine(left, right, "#059669", `ok-${left}`);
      }
      for (const left of leftOrder) {
        const chosen = picks[left];
        const want = correctRightByLeft.get(left);
        if (chosen && want && chosen !== want) {
          addLine(left, chosen, "#dc2626", `bad-${left}`);
        }
      }
    }

    setLines(next);
  }, [disabled, picks, leftOrder, pairs, correctRightByLeft]);

  useLayoutEffect(() => {
    measureLines();
  }, [measureLines]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measureLines());
    ro.observe(root);
    return () => ro.disconnect();
  }, [measureLines]);

  useLayoutEffect(() => {
    const onWin = () => measureLines();
    window.addEventListener("resize", onWin);
    return () => window.removeEventListener("resize", onWin);
  }, [measureLines]);

  const handleLeftActivate = (left: string) => {
    if (disabled) return;
    setActiveLeft((prev) => (prev === left ? null : left));
  };

  const handleRightPick = (right: string) => {
    if (disabled || !activeLeft) return;
    onPick(activeLeft, right);
    setActiveLeft(null);
  };

  const onLeftKeyDown = (e: KeyboardEvent<HTMLDivElement>, left: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleLeftActivate(left);
    }
  };

  const onRightKeyDown = (e: KeyboardEvent<HTMLDivElement>, right: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleRightPick(right);
    }
  };

  const clearPair = (e: MouseEvent, left: string) => {
    e.stopPropagation();
    if (disabled) return;
    onPick(left, "");
    setActiveLeft(null);
  };

  const allChosen = leftOrder.every((left) => Boolean(picks[left]));

  const assignedLeftForRight = (right: string): string | undefined => {
    for (const left of leftOrder) {
      if (picks[left] === right) return left;
    }
    return undefined;
  };

  const pickResultsByLeft = useMemo(() => {
    const m = new Map<string, MatchPairPickResult>();
    if (!disabled) return m;
    for (const r of evaluateMatchPairPicks(pairs, picks)) {
      m.set(r.left, r);
    }
    return m;
  }, [disabled, pairs, picks]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Cliquez un <span className="font-medium text-slate-800">libellé</span> (colonne de gauche), puis la{" "}
        <span className="font-medium text-slate-800">description</span> qui correspond. Les traits relient les
        paires. Utilisez la petite croix sur un libellé pour effacer son appariement.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white [-webkit-overflow-scrolling:touch]">
        <div ref={rootRef} className="relative min-w-[520px] p-4 sm:min-w-[560px]">
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible rounded-xl"
            aria-hidden
          >
            {lines.map(({ x1, y1, x2, y2, stroke, key }) => (
              <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={2} strokeLinecap="round" />
            ))}
          </svg>

          <div className="relative z-[1] flex flex-row gap-6">
            <div className="min-w-0 flex-1 space-y-3" role="list" aria-label="Libellés">
            {leftOrder.map((left) => {
              const i = leftIndex.get(left) ?? 0;
              const pal = NODE_PALETTE[i % NODE_PALETTE.length];
              const letter = letterForIndex(i);
              const selected = activeLeft === left;
              const hasPick = Boolean(picks[left]);
              const pr = pickResultsByLeft.get(left);
              const revealLeft =
                disabled && pr
                  ? pr.chosenRight
                    ? pr.ok
                      ? "ring-2 ring-emerald-400/80 border-emerald-400"
                      : "ring-2 ring-rose-400/80 border-rose-400"
                    : "ring-2 ring-amber-200 border-amber-400"
                  : "";

              return (
                <div
                  key={left}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-pressed={selected}
                  aria-label={`Libellé ${letter}. ${left}`}
                  onClick={() => handleLeftActivate(left)}
                  onKeyDown={(e) => onLeftKeyDown(e, left)}
                  className={`flex cursor-pointer items-stretch rounded-xl border bg-white text-left shadow-sm transition outline-none ${
                    disabled
                      ? `cursor-default ${revealLeft || "border-slate-200"}`
                      : selected
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="min-w-0 flex-1 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug text-slate-900">{left}</p>
                      {hasPick && !disabled ? (
                        <button
                          type="button"
                          onClick={(e) => clearPair(e, left)}
                          className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                          aria-label="Effacer cet appariement"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex w-11 shrink-0 items-center justify-center border-l border-slate-100 bg-slate-50/80">
                    <div
                      ref={setLeftAnchor(left)}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${pal.node}`}
                    >
                      {letter}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="min-w-0 flex-1 space-y-3" role="list" aria-label="Descriptions">
            {rightChoices.map((right) => {
              const owner = assignedLeftForRight(right);
              const ownerIdx = owner !== undefined ? (leftIndex.get(owner) ?? 0) : -1;
              const pal = ownerIdx >= 0 ? NODE_PALETTE[ownerIdx % NODE_PALETTE.length] : null;
              const letter = ownerIdx >= 0 ? letterForIndex(ownerIdx) : "";
              const canClick = Boolean(activeLeft) && !disabled;
              const ownerPick = owner ? pickResultsByLeft.get(owner) : undefined;
              const revealRight =
                disabled && ownerPick && ownerPick.chosenRight === right
                  ? ownerPick.ok
                    ? "ring-2 ring-emerald-400/80 border-emerald-400"
                    : "ring-2 ring-rose-400/80 border-rose-400"
                  : "";

              return (
                <div
                  key={right}
                  role="button"
                  tabIndex={canClick ? 0 : -1}
                  aria-label={owner ? `Description liée à ${letter}. ${right}` : `Description. ${right}`}
                  onClick={() => handleRightPick(right)}
                  onKeyDown={(e) => onRightKeyDown(e, right)}
                  className={`flex items-stretch rounded-xl border bg-white text-left shadow-sm transition outline-none ${
                    disabled
                      ? `cursor-default ${revealRight || "border-slate-200"}`
                      : canClick
                        ? "cursor-pointer border-blue-300 hover:border-blue-400 hover:bg-blue-50/40"
                        : "cursor-default border-slate-200"
                  }`}
                >
                  <div className="flex w-11 shrink-0 items-center justify-center border-r border-slate-100 bg-slate-50/80">
                    <div
                      ref={setRightAnchor(right)}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                        pal
                          ? pal.node
                          : "border-slate-200 bg-white text-slate-300"
                      }`}
                    >
                      {letter || "·"}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 p-3">
                    <p className="text-sm leading-snug text-slate-800">{right}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>

      {!disabled && !allChosen ? (
        <p className="text-xs text-slate-500">Reliez chaque libellé à une description pour valider.</p>
      ) : null}
      {disabled ? (
        <div className="space-y-3 text-xs text-slate-600">
          <p>
            <span className="font-medium text-emerald-700">Vert</span> : bon appariement.{" "}
            <span className="font-medium text-rose-700">Rouge</span> : incorrect.{" "}
            <span className="font-medium text-amber-800">Ambre</span> : aucune description choisie.
          </p>
          <ul className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
            {leftOrder.map((left) => {
              const r = pickResultsByLeft.get(left);
              if (!r) return null;
              const letter = letterForIndex(leftIndex.get(left) ?? 0);
              return (
                <li
                  key={left}
                  className={`rounded-md border px-2 py-1.5 ${
                    r.ok ? "border-emerald-200 bg-emerald-50/90" : "border-rose-200 bg-rose-50/90"
                  }`}
                >
                  <span className="font-mono text-[11px] font-bold text-slate-600">{letter}</span>
                  {" · "}
                  <span className="font-medium">{r.left}</span>
                  {" — "}
                  {r.ok ? (
                    <span className="text-emerald-800">Correct.</span>
                  ) : (
                    <span className="text-rose-900">
                      Incorrect. Attendu : <span className="font-medium">{r.expectedRight}</span>
                      {r.chosenRight ? (
                        <>
                          {" · "}
                          Votre choix : <span className="font-medium">{r.chosenRight}</span>
                        </>
                      ) : (
                        <> · Aucune description reliée.</>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export { matchPairPicksAreCorrect } from "@/lib/questionUi";
