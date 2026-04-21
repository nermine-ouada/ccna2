"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ProgressBar from "@/components/ProgressBar";
import QuestionCard from "@/components/QuestionCard";
import { allQuestions, ccna1Questions, ccna2Questions } from "@/lib/questions";

export default function QuizPage() {
  const searchParams = useSearchParams();
  const selectedCourse = searchParams.get("course");
  const questions = useMemo(() => {
    if (selectedCourse === "CCNA 1") return ccna1Questions;
    if (selectedCourse === "CCNA 2") return ccna2Questions;
    return allQuestions;
  }, [selectedCourse]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [randomMode, setRandomMode] = useState(false);
  const [score, setScore] = useState(0);

  if (!questions.length) {
    return <p>No questions available. Run `npm run parse` first.</p>;
  }

  const orderedQuestions = useMemo(() => {
    if (!randomMode) return questions;
    const shuffled = [...questions];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [questions, randomMode]);

  const current = orderedQuestions[index];
  const isMulti = current.correctAnswers.length > 1;
  const effectiveRevealed = revealed || showAnswers;
  const isOrderingQuestion =
    /correspondre|séquence|sequence|ordre|classer|rank/i.test(current.question) &&
    current.options.length > 1 &&
    current.correctAnswers.length === current.options.length;
  const selectionTypeLabel = isOrderingQuestion
    ? "Ordering"
    : isMulti
      ? "Multiple choice"
      : "Single choice";

  const toggleOption = (option: string) => {
    if (effectiveRevealed) return;
    if (isMulti) {
      setSelected((prev) =>
        prev.includes(option) ? prev.filter((v) => v !== option) : [...prev, option]
      );
    } else {
      setSelected([option]);
    }
  };

  const submitAnswer = () => {
    if (revealed) return;
    const isCorrect = isOrderingQuestion
      ? JSON.stringify(selected) === JSON.stringify(current.correctAnswers)
      : JSON.stringify([...selected].sort()) === JSON.stringify([...current.correctAnswers].sort());
    if (isCorrect) setScore((prev) => prev + 1);
    setRevealed(true);
  };

  const goNext = () => {
    setIndex((prev) => Math.min(prev + 1, orderedQuestions.length - 1));
    setSelected([]);
    setRevealed(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Quiz Mode{selectedCourse ? ` - ${selectedCourse}` : ""}
        </h1>
        <Link href="/" className="text-sm text-blue-700 hover:underline">
          Back Home
        </Link>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="font-medium">Score: {score}</p>
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
            setSelected([]);
            setRevealed(false);
            setScore(0);
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
        >
          {randomMode ? "In Order" : "Random"}
        </button>
      </div>

      <QuestionCard question={current}>
        <p className="mb-2 text-sm text-slate-600">{selectionTypeLabel}</p>
        <div className="space-y-3">
          {current.options.map((option) => {
            const checked = selected.includes(option);
            const isCorrect = current.correctAnswers.includes(option);
            const isWrongSelection = effectiveRevealed && checked && !isCorrect;
            const isCorrectReveal = effectiveRevealed && isCorrect;
            const selectedOrder = selected.indexOf(option) + 1;

            const optionStyle = isCorrectReveal
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : isWrongSelection
                ? "border-rose-300 bg-rose-50 text-rose-900"
                : checked
                  ? "border-blue-400 bg-blue-50 text-blue-900"
                  : "border-slate-200 bg-white text-slate-900";

            return (
              <button
                key={option}
                onClick={() => toggleOption(option)}
                className={`w-full rounded-xl border p-3 text-left transition ${optionStyle} ${
                  effectiveRevealed ? "" : "hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center gap-3">
                  {isOrderingQuestion ? (
                    <span
                      className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-2 text-xs font-semibold ${
                        checked
                          ? "border-slate-800 bg-slate-800 text-white"
                          : "border-slate-300 text-slate-500"
                      }`}
                    >
                      {checked ? selectedOrder : "#"}
                    </span>
                  ) : isMulti ? (
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded border text-xs ${
                        checked
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  ) : (
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                        checked
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 text-transparent"
                      }`}
                    >
                      ●
                    </span>
                  )}
                  <span>{option}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 space-y-4">
          {!effectiveRevealed ? (
            <button
              onClick={submitAnswer}
              disabled={selected.length === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-40"
            >
              Submit
            </button>
          ) : (
            <>
              {current.explanation ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                  {current.explanation}
                </div>
              ) : null}
              <button
                onClick={goNext}
                disabled={index === orderedQuestions.length - 1}
                className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
              >
                Next
              </button>
            </>
          )}
        </div>
      </QuestionCard>
    </div>
  );
}
