"use client";

import { splitMatchArrowOption } from "@/lib/questionUi";

export default function MatchOptionContent({ option }: { option: string }) {
  const pair = splitMatchArrowOption(option);
  if (!pair) {
    return <span className="leading-relaxed">{option}</span>;
  }

  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1 leading-relaxed">
      <span className="font-semibold text-slate-900 dark:text-slate-100">{pair.left}</span>
      <span className="select-none text-slate-400 dark:text-slate-500" aria-hidden>
        →
      </span>
      <span className="min-w-0 flex-[1_1_12rem] text-slate-700 dark:text-slate-300">{pair.right}</span>
    </span>
  );
}
