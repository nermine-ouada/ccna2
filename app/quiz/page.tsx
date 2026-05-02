"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import MatchOptionContent from "@/components/MatchOptionContent";
import MatchPairAnswerReview from "@/components/MatchPairAnswerReview";
import MatchPairPicker, { matchPairPicksAreCorrect } from "@/components/MatchPairPicker";
import OrderingAnswerFlow from "@/components/OrderingAnswerFlow";
import ProgressBar from "@/components/ProgressBar";
import QuestionCard from "@/components/QuestionCard";
import { allQuestions, ccna1Questions, ccna2Questions } from "@/lib/questions";
import {
  isOrderingQuestion as questionIsOrdering,
  isPairMatchQuestion,
  isStructuredMatchTableQuestion,
  optionsUseMatchArrows
} from "@/lib/questionUi";
import { shuffleDeterministic } from "@/lib/shuffle";

export default function QuizPage() {
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
  const [selected, setSelected] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [randomMode, setRandomMode] = useState(false);
  const [score, setScore] = useState(0);
  const [pairPicks, setPairPicks] = useState<Record<string, string>>({});

  const orderedQuestions = useMemo(() => {
    if (!randomMode) return questions;
    return shuffleDeterministic(
      questions,
      `quiz-deck|${randomMode}|${questions.map((q) => q.id).join(",")}`
    );
  }, [questions, randomMode]);
  const current = orderedQuestions[index];
  const orderedOptions = useMemo(
    () =>
      current && !isPairMatchQuestion(current)
        ? shuffleDeterministic(current.options, `quiz-opt|${current.id}|${index}`)
        : [],
    [current, index]
  );

  const pairMatch = Boolean(current && isPairMatchQuestion(current));
  const matchPairs = current?.matchPairs ?? [];
  const leftOrder = useMemo(() => {
    if (!current || !pairMatch) return [];
    return shuffleDeterministic(
      (current.matchPairs ?? []).map((p) => p.left),
      `quiz-left|${current.id}|${index}`
    );
  }, [current, pairMatch, index]);
  const rightChoices = useMemo(() => {
    if (!current || !pairMatch) return [];
    return shuffleDeterministic(
      (current.matchPairs ?? []).map((p) => p.right),
      `quiz-right|${current.id}|${index}`
    );
  }, [current, pairMatch, index]);

  useEffect(() => {
    if (current) setPairPicks({});
  }, [current, index]);

  if (!current) {
    return <p>No questions available. Run `npm run parse` first.</p>;
  }

  const isMulti = current.correctAnswers.length > 1;
  const hasKnownAnswer =
    (isPairMatchQuestion(current) && (current.matchPairs?.length ?? 0) >= 2) ||
    current.correctAnswers.length > 0;
  const effectiveRevealed = revealed || showAnswers;
  const isOrderingQuestion = questionIsOrdering(current);
  const useMatchArrows = optionsUseMatchArrows(current.options);
  const pairComplete =
    pairMatch && matchPairs.length > 0 && matchPairs.every(({ left }) => Boolean(pairPicks[left]));

  const selectionTypeLabel = pairMatch
    ? "Appariement : libellé → description (tableau source)"
    : isOrderingQuestion
      ? useMatchArrows
        ? "Ordre : cliquez dans la séquence (libellé → description)"
        : "Séquence : cliquez les étapes dans le bon ordre"
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
    if (!hasKnownAnswer) return;
    let isCorrect = false;
    if (pairMatch) {
      isCorrect = matchPairPicksAreCorrect(matchPairs, pairPicks);
    } else if (isOrderingQuestion) {
      isCorrect = JSON.stringify(selected) === JSON.stringify(current.correctAnswers);
    } else {
      isCorrect =
        JSON.stringify([...selected].sort()) === JSON.stringify([...current.correctAnswers].sort());
    }
    if (isCorrect) setScore((prev) => prev + 1);
    setRevealed(true);
  };

  const goNext = () => {
    setIndex((prev) => Math.min(prev + 1, orderedQuestions.length - 1));
    setSelected([]);
    setPairPicks({});
    setRevealed(false);
  };

  const goPrev = () => {
    setIndex((prev) => Math.max(prev - 1, 0));
    setSelected([]);
    setPairPicks({});
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
      <ProgressBar current={index + 1} total={orderedQuestions.length} />
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
            setPairPicks({});
            setRevealed(false);
            setScore(0);
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
        >
          {randomMode ? "In Order" : "Random"}
        </button>
      </div>

      <QuestionCard question={current} deferImage={isStructuredMatchTableQuestion(current)}>
        <p className="mb-2 text-sm text-slate-600">{selectionTypeLabel}</p>
        {!hasKnownAnswer ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            No verified answer found for this question yet.
          </div>
        ) : null}
        {pairMatch ? (
          <MatchPairPicker
            pairs={matchPairs}
            leftOrder={leftOrder}
            rightChoices={rightChoices}
            picks={pairPicks}
            onPick={(left, right) =>
              setPairPicks((prev) => {
                if (!right) {
                  const next = { ...prev };
                  delete next[left];
                  return next;
                }
                const next = { ...prev };
                for (const k of Object.keys(next)) {
                  if (next[k] === right) delete next[k];
                }
                next[left] = right;
                return next;
              })
            }
            disabled={effectiveRevealed}
          />
        ) : (
          <div className="space-y-3">
            {orderedOptions.map((option) => {
              const checked = selected.includes(option);
              const selIdx = selected.indexOf(option);
              const inCorrectSequenceSlot =
                isOrderingQuestion &&
                selIdx >= 0 &&
                selIdx < current.correctAnswers.length &&
                selected[selIdx] === current.correctAnswers[selIdx];
              const isMcqCorrectOption = current.correctAnswers.includes(option);
              const isWrongMcqPick = effectiveRevealed && checked && !isMcqCorrectOption;
              const isCorrectMcqReveal = effectiveRevealed && isMcqCorrectOption;

              const selectedOrder = selIdx + 1;

              const optionStyle =
                effectiveRevealed && isOrderingQuestion
                  ? checked
                    ? inCorrectSequenceSlot
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                      : "border-rose-300 bg-rose-50 text-rose-900"
                    : "border-slate-200 bg-white text-slate-500"
                  : isCorrectMcqReveal
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : isWrongMcqPick
                      ? "border-rose-300 bg-rose-50 text-rose-900"
                      : checked
                        ? "border-blue-400 bg-blue-50 text-blue-900"
                        : "border-slate-200 bg-white text-slate-900";

              const orderingBadgeClass =
                !checked
                  ? "border-slate-300 text-slate-500"
                  : !effectiveRevealed || !isOrderingQuestion
                    ? "border-slate-800 bg-slate-800 text-white"
                    : inCorrectSequenceSlot
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-rose-600 bg-rose-600 text-white";

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
                        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full border px-2 text-xs font-semibold ${orderingBadgeClass}`}
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
                    <span className="min-w-0 flex-1 text-left">
                      {useMatchArrows ? <MatchOptionContent option={option} /> : option}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {effectiveRevealed && pairMatch ? (
          <div className="mt-4">
            <MatchPairAnswerReview pairs={matchPairs} />
          </div>
        ) : null}

        {effectiveRevealed && isOrderingQuestion && !pairMatch ? (
          <div className="mt-4">
            <OrderingAnswerFlow
              steps={current.correctAnswers}
              title={
                useMatchArrows
                  ? "Réponse : ordre des appariements (libellé → description)"
                  : "Réponse : ordre des étapes"
              }
            />
          </div>
        ) : null}

        {effectiveRevealed && isStructuredMatchTableQuestion(current) && current.image ? (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              Illustration de référence (figure du corrigé)
            </p>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-white">
              <Image
                src={current.image}
                alt="Figure de référence avec la solution"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 800px"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          {!effectiveRevealed ? (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={submitAnswer}
                disabled={
                  !hasKnownAnswer ||
                  (pairMatch ? !pairComplete : selected.length === 0)
                }
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-40"
              >
                Submit
              </button>
              <button
                onClick={goPrev}
                disabled={index === 0}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={goNext}
                disabled={index === orderedQuestions.length - 1}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 disabled:opacity-40"
              >
                Skip
              </button>
            </div>
          ) : (
            <>
              {current.explanation ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                  {current.explanation}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={goPrev}
                  disabled={index === 0}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={goNext}
                  disabled={index === orderedQuestions.length - 1}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </QuestionCard>
    </div>
  );
}
