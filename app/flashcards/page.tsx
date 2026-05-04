"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AnswerList from "@/components/AnswerList";
import MatchPairAnswerReview from "@/components/MatchPairAnswerReview";
import OrderingAnswerFlow from "@/components/OrderingAnswerFlow";
import ProgressBar from "@/components/ProgressBar";
import QuestionCard from "@/components/QuestionCard";
import { allQuestions, ccna1Questions, ccna2Questions } from "@/lib/questions";
import {
  isOrderingQuestion as questionIsOrdering,
  isPairMatchQuestion
} from "@/lib/questionUi";
import { shuffleDeterministic } from "@/lib/shuffle";

export default function FlashcardsPage() {
  const [selectedCourse, setSelectedCourse] = useState<"CCNA 1" | "CCNA 2">("CCNA 2");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const course = params.get("course");
    setSelectedCourse(course === "CCNA 1" ? "CCNA 1" : "CCNA 2");
  }, []);
  const questions = useMemo(() => {
    if (selectedCourse === "CCNA 1") return ccna1Questions;
    if (selectedCourse === "CCNA 2") return ccna2Questions;
    return allQuestions;
  }, [selectedCourse]);
  const [index, setIndex] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const [showAllOptions, setShowAllOptions] = useState(true);
  const [randomMode, setRandomMode] = useState(false);

  const orderedQuestions = useMemo(() => {
    if (!randomMode) return questions;
    return shuffleDeterministic(
      questions,
      `fc-deck|${randomMode}|${questions.map((q) => q.id).join(",")}`
    );
  }, [questions, randomMode]);
  const current = orderedQuestions[index];
  const visibleOptions = useMemo(() => {
    if (!current) return [];
    if (!showAllOptions) return current.correctAnswers;
    return shuffleDeterministic(current.options, `fc-opt|${current.id}|${index}`);
  }, [current, showAllOptions, index]);

  if (!current) {
    return (
      <p className="text-slate-700 dark:text-slate-300">No questions available. Run `npm run parse` first.</p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Flashcards{selectedCourse ? ` - ${selectedCourse}` : ""}
        </h1>
        <Link href="/" className="text-sm text-blue-700 hover:underline dark:text-blue-400">
          Back Home
        </Link>
      </div>

      <ProgressBar
        current={index + 1}
        total={orderedQuestions.length}
        onSeek={(q) => {
          const nextIdx = Math.min(Math.max(1, q), orderedQuestions.length) - 1;
          if (nextIdx !== index) setIndex(nextIdx);
        }}
      />

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
        {showAnswers && !questionIsOrdering(current) && !isPairMatchQuestion(current) ? (
          <button
            onClick={() => setShowAllOptions((prev) => !prev)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {showAllOptions ? "Hide false answers" : "Show all options"}
          </button>
        ) : null}
      </div>

      <QuestionCard question={current}>
        {showAnswers ? (
          <div className="space-y-4">
            {isPairMatchQuestion(current) && current.matchPairs ? (
              <>
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Appariements (libellé → description)
                </p>
                <MatchPairAnswerReview pairs={current.matchPairs} />
              </>
            ) : questionIsOrdering(current) ? (
              <>
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">Séquence attendue</p>
                <OrderingAnswerFlow steps={current.correctAnswers} />
              </>
            ) : (
              <>
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                  {showAllOptions ? "Options (correct highlighted):" : "Correct answer(s):"}
                </p>
                <AnswerList
                  options={visibleOptions}
                  correctAnswers={current.correctAnswers}
                  revealed
                />
              </>
            )}
            {current.explanation ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
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
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
