"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import AnswerList from "@/components/AnswerList";
import ProgressBar from "@/components/ProgressBar";
import QuestionCard from "@/components/QuestionCard";
import { allQuestions } from "@/lib/questions";

export default function QuizPage() {
  const questions = useMemo(() => allQuestions, []);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);

  if (!questions.length) {
    return <p>No questions available. Run `npm run parse` first.</p>;
  }

  const current = questions[index];
  const isMulti = current.correctAnswers.length > 1;

  const toggleOption = (option: string) => {
    if (revealed) return;
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
    const sortedSelected = [...selected].sort();
    const sortedCorrect = [...current.correctAnswers].sort();
    const isCorrect = JSON.stringify(sortedSelected) === JSON.stringify(sortedCorrect);
    if (isCorrect) setScore((prev) => prev + 1);
    setRevealed(true);
  };

  const goNext = () => {
    setIndex((prev) => Math.min(prev + 1, questions.length - 1));
    setSelected([]);
    setRevealed(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quiz Mode</h1>
        <Link href="/" className="text-sm text-blue-700 hover:underline">
          Back Home
        </Link>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <p className="font-medium">Score: {score}</p>
      </div>
      <ProgressBar current={index + 1} total={questions.length} />

      <QuestionCard question={current}>
        <div className="space-y-3">
          {current.options.map((option) => {
            const checked = selected.includes(option);
            return (
              <button
                key={option}
                onClick={() => toggleOption(option)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  checked
                    ? "border-blue-400 bg-blue-50 text-blue-900"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        <div className="mt-5 space-y-4">
          {!revealed ? (
            <button
              onClick={submitAnswer}
              disabled={selected.length === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-40"
            >
              Submit
            </button>
          ) : (
            <>
              <AnswerList
                options={current.options}
                correctAnswers={current.correctAnswers}
                selected={selected}
                revealed
              />
              {current.explanation ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                  {current.explanation}
                </div>
              ) : null}
              <button
                onClick={goNext}
                disabled={index === questions.length - 1}
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
