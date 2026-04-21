"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AnswerList from "@/components/AnswerList";
import ProgressBar from "@/components/ProgressBar";
import QuestionCard from "@/components/QuestionCard";
import { allQuestions } from "@/lib/questions";

export default function FlashcardsPage() {
  const questions = useMemo(() => allQuestions, []);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (!questions.length) {
    return <p>No questions available. Run `npm run parse` first.</p>;
  }

  const current = questions[index];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Flashcards</h1>
        <Link href="/" className="text-sm text-blue-700 hover:underline">
          Back Home
        </Link>
      </div>

      <ProgressBar current={index + 1} total={questions.length} />

      <QuestionCard question={current}>
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Show Answer
          </button>
        ) : (
          <div className="space-y-4">
            <p className="font-semibold text-emerald-800">Correct answer(s):</p>
            <AnswerList
              options={current.correctAnswers}
              correctAnswers={current.correctAnswers}
              revealed
            />
            {current.explanation ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                {current.explanation}
              </div>
            ) : null}
          </div>
        )}
      </QuestionCard>

      <div className="flex gap-3">
        <button
          onClick={() => {
            setIndex((prev) => Math.max(prev - 1, 0));
            setRevealed(false);
          }}
          disabled={index === 0}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          onClick={() => {
            setIndex((prev) => Math.min(prev + 1, questions.length - 1));
            setRevealed(false);
          }}
          disabled={index === questions.length - 1}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
