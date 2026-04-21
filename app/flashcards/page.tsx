"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AnswerList from "@/components/AnswerList";
import ProgressBar from "@/components/ProgressBar";
import QuestionCard from "@/components/QuestionCard";
import { allQuestions, ccna1Questions, ccna2Questions } from "@/lib/questions";

export default function FlashcardsPage() {
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSelectedCourse(params.get("course"));
  }, []);
  const questions = useMemo(() => {
    if (selectedCourse === "CCNA 1") return ccna1Questions;
    if (selectedCourse === "CCNA 2") return ccna2Questions;
    return allQuestions;
  }, [selectedCourse]);
  const [index, setIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const [randomMode, setRandomMode] = useState(false);

  const orderedQuestions = useMemo(() => {
    if (!randomMode) return questions;
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [questions, randomMode]);

  if (!questions.length) {
    return <p>No questions available. Run `npm run parse` first.</p>;
  }

  const current = orderedQuestions[index];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Flashcards{selectedCourse ? ` - ${selectedCourse}` : ""}
        </h1>
        <Link href="/" className="text-sm text-blue-700 hover:underline">
          Back Home
        </Link>
      </div>

      <ProgressBar current={index + 1} total={questions.length} />

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowAnswers((prev) => !prev)}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          {showAnswers ? "Hide Answer" : "Show Answer"}
        </button>
        <button
          onClick={() => {
            setRandomMode((prev) => !prev);
            setIndex(0);
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
        >
          {randomMode ? "In Order" : "Random"}
        </button>
      </div>

      <QuestionCard question={current}>
        {showAnswers ? (
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
        ) : null}
      </QuestionCard>

      <div className="flex gap-3">
        <button
          onClick={() => setIndex((prev) => Math.max(prev - 1, 0))}
          disabled={index === 0}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 disabled:opacity-40"
        >
          Previous
        </button>
        <button
          onClick={() => setIndex((prev) => Math.min(prev + 1, orderedQuestions.length - 1))}
          disabled={index === orderedQuestions.length - 1}
          className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
