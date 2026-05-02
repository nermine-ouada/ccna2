"use client";

import MatchOptionContent from "@/components/MatchOptionContent";
import { optionsUseMatchArrows } from "@/lib/questionUi";

type OrderingAnswerFlowProps = {
  steps: string[];
  title?: string;
};

export default function OrderingAnswerFlow({
  steps,
  title = "Ordre correct (étapes)"
}: OrderingAnswerFlowProps) {
  const useArrows = optionsUseMatchArrows(steps);

  return (
    <div
      className="rounded-xl border border-emerald-200 bg-emerald-50/95 p-4 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100"
      role="region"
      aria-label={title}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-900 dark:text-emerald-300">
        {title}
      </p>
      <ol className="list-none space-y-0">
        {steps.map((step, i) => (
          <li key={`${i}-${step.slice(0, 48)}`}>
            <div className="flex gap-3 rounded-lg border border-emerald-100 bg-white/90 px-3 py-2.5 dark:border-emerald-800 dark:bg-slate-900/90">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 text-sm">
                {useArrows ? <MatchOptionContent option={step} /> : <span>{step}</span>}
              </div>
            </div>
            {i < steps.length - 1 ? (
              <div
                className="flex justify-center py-1.5 text-lg font-light text-emerald-700 dark:text-emerald-400"
                aria-hidden
              >
                ↓
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
