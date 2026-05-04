"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import MatchOptionContent from "@/components/MatchOptionContent";
import MatchPairAnswerReview from "@/components/MatchPairAnswerReview";
import MatchPairPicker, { matchPairPicksAreCorrect } from "@/components/MatchPairPicker";
import OrderingAnswerFlow from "@/components/OrderingAnswerFlow";
import ProgressBar from "@/components/ProgressBar";
import QuestionCard from "@/components/QuestionCard";
import { loadQuizSession, saveQuizSession, type QuizQuestionPersist } from "@/lib/quizPersist";
import { allQuestions, ccna1Questions, ccna2Questions } from "@/lib/questions";
import {
  isOrderingQuestion as questionIsOrdering,
  isPairMatchQuestion,
  isStructuredMatchTableQuestion,
  optionsUseMatchArrows
} from "@/lib/questionUi";
import { shuffleDeterministic } from "@/lib/shuffle";

const emptyPersist = (): QuizQuestionPersist => ({
  selected: [],
  pairPicks: {},
  revealed: false,
  scored: false
});

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

  const deckKey = useMemo(() => questions.map((q) => q.id).join(","), [questions]);

  const [index, setIndex] = useState(0);
  const [randomMode, setRandomMode] = useState(false);
  const [score, setScore] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<number, QuizQuestionPersist>>({});
  const [shuffleNonce, setShuffleNonce] = useState<Record<number, number>>({});
  const [clientReady, setClientReady] = useState(false);

  const [selected, setSelected] = useState<string[]>([]);
  const [pairPicks, setPairPicks] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [scored, setScored] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  const answersMapRef = useRef(answersMap);
  useEffect(() => {
    answersMapRef.current = answersMap;
  }, [answersMap]);

  useEffect(() => {
    setClientReady(true);
  }, []);

  const lastSessionKey = useRef("");
  useEffect(() => {
    if (!questions.length) return;
    const key = `${selectedCourse}|${randomMode}|${deckKey}`;
    if (key === lastSessionKey.current) return;
    lastSessionKey.current = key;
    const s = loadQuizSession(selectedCourse, randomMode, deckKey);
    if (!s) return;
    const map: Record<number, QuizQuestionPersist> = {};
    for (const [k, v] of Object.entries(s.answers)) {
      map[Number(k)] = v;
    }
    setAnswersMap(map);
    answersMapRef.current = map;
    setScore(s.score);
    setIndex(Math.min(Math.max(0, s.index), questions.length - 1));
  }, [selectedCourse, randomMode, deckKey, questions.length]);

  const orderedQuestions = useMemo(() => {
    if (!randomMode) return questions;
    return shuffleDeterministic(
      questions,
      `quiz-deck|${randomMode}|${questions.map((q) => q.id).join(",")}`
    );
  }, [questions, randomMode]);

  const current = orderedQuestions[index];

  const bumpShuffle = useCallback((questionId: number) => {
    setShuffleNonce((prev) => ({
      ...prev,
      [questionId]: (prev[questionId] ?? 0) + 1
    }));
  }, []);

  const shuffleSalt = useCallback(
    (qid: number) => (clientReady ? (shuffleNonce[qid] ?? 0) : 0),
    [clientReady, shuffleNonce]
  );

  const orderedOptions = useMemo(
    () =>
      current && !isPairMatchQuestion(current)
        ? shuffleDeterministic(
            current.options,
            `quiz-opt|${current.id}|${index}|${shuffleSalt(current.id)}`
          )
        : [],
    [current, index, shuffleSalt]
  );

  const pairMatch = Boolean(current && isPairMatchQuestion(current));
  const matchPairs = current?.matchPairs ?? [];

  const leftOrder = useMemo(() => {
    if (!current || !pairMatch) return [];
    return shuffleDeterministic(
      (current.matchPairs ?? []).map((p) => p.left),
      `quiz-left|${current.id}|${index}|${shuffleSalt(current.id)}`
    );
  }, [current, pairMatch, index, shuffleSalt]);

  const rightChoices = useMemo(() => {
    if (!current || !pairMatch) return [];
    return shuffleDeterministic(
      (current.matchPairs ?? []).map((p) => p.right),
      `quiz-right|${current.id}|${index}|${shuffleSalt(current.id)}`
    );
  }, [current, pairMatch, index, shuffleSalt]);

  useEffect(() => {
    const q = orderedQuestions[index];
    if (!q) return;
    const e = answersMapRef.current[q.id];
    setSelected(e?.selected ? [...e.selected] : []);
    setPairPicks(e?.pairPicks ? { ...e.pairPicks } : {});
    setRevealed(Boolean(e?.revealed));
    setScored(Boolean(e?.scored));
  }, [index, randomMode, orderedQuestions]);

  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => {
      setAnswersMap((m) => ({
        ...m,
        [current.id]: {
          selected: [...selected],
          pairPicks: { ...pairPicks },
          revealed,
          scored
        }
      }));
    }, 120);
    return () => window.clearTimeout(t);
  }, [selected, pairPicks, revealed, scored, current]);

  useEffect(() => {
    if (!questions.length) return;
    const t = window.setTimeout(() => {
      const answersOut: Record<string, QuizQuestionPersist> = {};
      for (const [k, v] of Object.entries(answersMapRef.current)) {
        answersOut[String(k)] = v;
      }
      saveQuizSession({
        v: 1,
        course: selectedCourse,
        randomMode,
        deckKey,
        index,
        score,
        answers: answersOut
      });
    }, 280);
    return () => window.clearTimeout(t);
  }, [answersMap, score, index, selectedCourse, randomMode, deckKey, questions.length]);

  if (!current) {
    return (
      <p className="text-slate-700 dark:text-slate-300">No questions available. Run `npm run parse` first.</p>
    );
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

  const persistCurrentToMap = () => {
    if (!current) return;
    setAnswersMap((m) => {
      const next = {
        ...m,
        [current.id]: {
          selected: [...selected],
          pairPicks: { ...pairPicks },
          revealed,
          scored
        }
      };
      answersMapRef.current = next;
      return next;
    });
  };

  const goNext = () => {
    persistCurrentToMap();
    const ni = Math.min(index + 1, orderedQuestions.length - 1);
    const nextQ = orderedQuestions[ni];
    if (nextQ) bumpShuffle(nextQ.id);
    setIndex(ni);
  };

  const goPrev = () => {
    persistCurrentToMap();
    const pi = Math.max(index - 1, 0);
    const prevQ = orderedQuestions[pi];
    if (prevQ) bumpShuffle(prevQ.id);
    setIndex(pi);
  };

  const redoAll = () => {
    if (
      !window.confirm(
        "Clear every answer in this quiz, reset the score to 0, and go back to the first question?"
      )
    ) {
      return;
    }
    answersMapRef.current = {};
    setAnswersMap({});
    setScore(0);
    setIndex(0);
    setSelected([]);
    setPairPicks({});
    setRevealed(false);
    setScored(false);
    setShowAnswers(false);
    setShuffleNonce({});
    const first = orderedQuestions[0];
    if (first) bumpShuffle(first.id);
  };

  const redoQuestion = () => {
    if (!current) return;
    bumpShuffle(current.id);

    const lastAttemptCorrect =
      revealed &&
      scored &&
      (pairMatch
        ? matchPairPicksAreCorrect(matchPairs, pairPicks)
        : isOrderingQuestion
          ? JSON.stringify(selected) === JSON.stringify(current.correctAnswers)
          : JSON.stringify([...selected].sort()) ===
            JSON.stringify([...current.correctAnswers].sort()));
    if (lastAttemptCorrect) setScore((s) => Math.max(0, s - 1));

    setSelected([]);
    setPairPicks({});
    setRevealed(false);
    setShowAnswers(false);
    setScored(false);
    setAnswersMap((m) => ({
      ...m,
      [current.id]: emptyPersist()
    }));
  };

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
    setScored(true);
    setRevealed(true);
  };

  const canGoPrev = index > 0;
  const canGoNext = index < orderedQuestions.length - 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Quiz Mode{selectedCourse ? ` - ${selectedCourse}` : ""}
        </h1>
        <Link href="/" className="text-sm text-blue-700 hover:underline dark:text-blue-400">
          Back Home
        </Link>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <p className="font-medium text-slate-900 dark:text-slate-100">Score: {score}</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          aria-label="Question précédente"
          onClick={goPrev}
          disabled={!canGoPrev}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          &lt;
        </button>
        <div className="min-w-0 flex-1 px-2">
          <ProgressBar
            current={index + 1}
            total={orderedQuestions.length}
            onSeek={(q) => {
              const nextIdx = Math.min(Math.max(1, q), orderedQuestions.length) - 1;
              if (nextIdx === index) return;
              persistCurrentToMap();
              const nextQ = orderedQuestions[nextIdx];
              if (nextQ) bumpShuffle(nextQ.id);
              setIndex(nextIdx);
            }}
          />
        </div>
        <button
          type="button"
          aria-label="Question suivante"
          onClick={goNext}
          disabled={!canGoNext}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          &gt;
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowAnswers((prev) => !prev)}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          {showAnswers ? "Hide Answer" : "Show Answer"}
        </button>
        <button
          onClick={() => {
            lastSessionKey.current = "";
            setRandomMode((prev) => !prev);
            setIndex(0);
            setSelected([]);
            setPairPicks({});
            setRevealed(false);
            setScored(false);
            setScore(0);
            setAnswersMap({});
            setShuffleNonce({});
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
        >
          {randomMode ? "In Order" : "Random"}
        </button>
        <button
          type="button"
          onClick={redoAll}
          className="rounded-lg border border-rose-400 bg-rose-50 px-4 py-2 font-medium text-rose-950 hover:bg-rose-100 dark:border-rose-600 dark:bg-rose-950/40 dark:text-rose-100 dark:hover:bg-rose-900/50"
        >
          Redo all
        </button>
      </div>

      <QuestionCard question={current} deferImage={isStructuredMatchTableQuestion(current)}>
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">{selectionTypeLabel}</p>
        {!hasKnownAnswer ? (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
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
                      ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-200"
                    : "border-slate-200 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-500"
                  : isCorrectMcqReveal
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : isWrongMcqPick
                      ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-600 dark:bg-rose-950/50 dark:text-rose-200"
                      : checked
                        ? "border-blue-400 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-200"
                        : "border-slate-200 bg-white text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

              const orderingBadgeClass =
                !checked
                  ? "border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-400"
                  : !effectiveRevealed || !isOrderingQuestion
                    ? "border-slate-800 bg-slate-800 text-white dark:border-slate-300 dark:bg-slate-200 dark:text-slate-900"
                    : inCorrectSequenceSlot
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-rose-600 bg-rose-600 text-white";

              return (
                <button
                  key={option}
                  onClick={() => toggleOption(option)}
                  className={`w-full rounded-xl border p-3 text-left transition ${optionStyle} ${
                    effectiveRevealed ? "" : "hover:bg-slate-50 dark:hover:bg-slate-800"
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
                            ? "border-slate-900 bg-slate-900 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900"
                            : "border-slate-300 text-transparent dark:border-slate-600"
                        }`}
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                          checked
                            ? "border-slate-900 bg-slate-900 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900"
                            : "border-slate-300 text-transparent dark:border-slate-600"
                        }`}
                      >
                        ●
                      </span>
                    )}
                    <span className="min-w-0 flex-1 whitespace-pre-line text-left">
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
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-600 dark:bg-slate-800/80">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
              Illustration de référence (figure du corrigé)
            </p>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-white dark:bg-slate-900">
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
                type="button"
                onClick={redoQuestion}
                className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/60"
              >
                Redo
              </button>
              <button
                onClick={goPrev}
                disabled={!canGoPrev}
                className="rounded-lg border border-slate-300 bg-rose-200 px-4 py-2 text-slate-900 disabled:opacity-40 dark:border-slate-600 dark:bg-rose-900/50 dark:text-rose-100"
              >
                Previous
              </button>
              <button
                onClick={goNext}
                disabled={!canGoNext}
                className="rounded-lg border border-slate-300 bg-rose-200 px-4 py-2 text-slate-900 disabled:opacity-40 dark:border-slate-600 dark:bg-rose-900/50 dark:text-rose-100"
              >
                Skip
              </button>
            </div>
          ) : (
            <>
              {current.explanation ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                  {current.explanation}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={redoQuestion}
                  className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 font-medium text-amber-950 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-100 dark:hover:bg-amber-900/60"
                >
                  Redo
                </button>
                <button
                  onClick={goPrev}
                  disabled={!canGoPrev}
                  className="rounded-lg border border-slate-300 bg-rose-200 px-4 py-2 text-slate-900 disabled:opacity-40 dark:border-slate-600 dark:bg-rose-900/50 dark:text-rose-100"
                >
                  Previous
                </button>
                <button
                  onClick={goNext}
                  disabled={!canGoNext}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
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
