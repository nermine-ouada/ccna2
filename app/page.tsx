"use client";

import Link from "next/link";
import { useState } from "react";

export default function HomePage() {
  const [course, setCourse] = useState<"CCNA 1" | "CCNA 2">("CCNA 2");
  const encodedCourse = encodeURIComponent(course);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-5xl">
        CCNA Practice
      </h1>
      <p className="text-slate-600 dark:text-slate-400">Train with flashcards or take a full quiz.</p>

      <div className="w-full rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">Choose Course</p>
        <div className="flex w-full gap-3">
          <button
            onClick={() => setCourse("CCNA 1")}
            className={`w-full rounded-lg px-4 py-2 font-medium ${
              course === "CCNA 1"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            CCNA 1
          </button>
          <button
            onClick={() => setCourse("CCNA 2")}
            className={`w-full rounded-lg px-4 py-2 font-medium ${
              course === "CCNA 2"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            CCNA 2
          </button>
        </div>
      </div>

      <div className="flex w-full flex-col gap-3 sm:flex-row">
        <Link
          href={`/flashcards?course=${encodedCourse}`}
          className="w-full rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
        >
          Flashcards Mode ({course})
        </Link>
        <Link
          href={`/quiz?course=${encodedCourse}`}
          className="w-full rounded-xl bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-700"
        >
          Quiz Mode ({course})
        </Link>
      </div>

      <div className="flex flex-col items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <a
            href="/ccna1.html"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-700 underline-offset-4 transition hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-slate-100"
          >
            CCNA réponses (CCNA 1)
          </a>
          <span className="text-slate-400 dark:text-slate-600" aria-hidden>
            |
          </span>
          <a
            href="/ccna2.html"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-700 underline-offset-4 transition hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-slate-100"
          >
            CCNA réponses (CCNA 2)
          </a>
        </p>
        <a
          href="https://github.com/nermine-ouada/ccna2"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-4 transition hover:text-slate-900 hover:underline dark:hover:text-slate-100"
        >
          GitHub Repository by nermine-ouada
        </a>
      </div>
    </div>
  );
}
