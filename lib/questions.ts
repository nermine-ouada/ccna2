import answerPatches from "@/data/answer-patches.json";
import questionsAll from "@/data/questions.json";
import questionsCcna1 from "@/data/questions-ccna1.json";
import questionsCcna2 from "@/data/questions-ccna2.json";
import type { MatchPair, Question } from "@/lib/types";
import { stripStepPrefix } from "@/lib/text";
import { splitMatchArrowOption } from "@/lib/questionUi";

type SourcePatch = { options: string[]; correctAnswers: string[] };
type PatchFile = Record<string, Record<string, SourcePatch>>;

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/** When HTML was parsed as "left - right" strings only, recover structured pairs for the match UI */
const DERIVE_MATCH_PAIRS_RE =
  /associez|faire correspondre|faites correspondre|état.{0,40}liaison|vlan\s+correct|fonctionnalités.{0,20}catégories|champ.{0,20}en-tête|modèles?\s+de\s+réseau/i;

function normalizeMatchPairs(question: Question, options: string[]): MatchPair[] | undefined {
  if (question.matchPairs && question.matchPairs.length >= 2) {
    const cleaned = question.matchPairs
      .map((p) => ({
        left: (stripStepPrefix(p.left) || p.left).trim(),
        right: stripStepPrefix(p.right)
      }))
      .filter((p) => p.left && p.right);
    return cleaned.length >= 2 ? cleaned : undefined;
  }
  if (!DERIVE_MATCH_PAIRS_RE.test(question.question)) return undefined;
  const derived: MatchPair[] = [];
  for (const opt of options) {
    const sp = splitMatchArrowOption(opt);
    if (!sp) return undefined;
    derived.push({ left: sp.left, right: sp.right });
  }
  if (derived.length < 2 || derived.length !== options.length) return undefined;
  return derived;
}

function normalizeQuestions(raw: Question[]): Question[] {
  return raw.map((question) => {
    const hadStructuredPairs = !!(question.matchPairs && question.matchPairs.length >= 2);
    const options = unique((question.options ?? []).map(stripStepPrefix).filter(Boolean));
    const correctAnswers = unique(
      (question.correctAnswers ?? []).map(stripStepPrefix).filter(Boolean)
    );
    const mergedOptions = options.length > 0 ? unique([...options, ...correctAnswers]) : correctAnswers;
    const matchPairs = normalizeMatchPairs({ ...question, options: mergedOptions }, mergedOptions);

    let outCorrect = correctAnswers;
    let outMerged = mergedOptions;

    if (matchPairs?.length) {
      if (question.pairMatchStyle === "ordering") {
        outCorrect = matchPairs.map((p) => stripStepPrefix(p.right));
        outMerged = hadStructuredPairs ? [...outCorrect] : unique([...options, ...outCorrect]);
      } else if (question.pairMatchStyle !== "ordering") {
        const joined = matchPairs.map((p) => `${p.left} - ${p.right}`);
        outCorrect = joined;
        outMerged = hadStructuredPairs ? [...joined] : unique([...options, ...joined]);
      }
    }

    return {
      ...question,
      options: outMerged,
      correctAnswers: outCorrect,
      ...(matchPairs?.length ? { matchPairs } : {}),
      ...(question.pairMatchStyle ? { pairMatchStyle: question.pairMatchStyle } : {})
    };
  });
}

function applyAnswerPatches(questions: Question[]): Question[] {
  const patches = answerPatches as PatchFile;
  return questions.map((question) => {
    if (!question.course || question.sourceId == null) return question;
    const forCourse = patches[question.course];
    if (!forCourse) return question;
    const patch = forCourse[String(question.sourceId)];
    if (!patch?.correctAnswers?.length) return question;
    const options = unique(patch.options.map(stripStepPrefix).filter(Boolean));
    const correctAnswers = unique(patch.correctAnswers.map(stripStepPrefix).filter(Boolean));
    const mergedOptions = options.length > 0 ? unique([...options, ...correctAnswers]) : correctAnswers;
    return { ...question, options: mergedOptions, correctAnswers };
  });
}

export const allQuestions = applyAnswerPatches(normalizeQuestions(questionsAll as Question[]));
export const ccna1Questions = applyAnswerPatches(normalizeQuestions(questionsCcna1 as Question[]));
export const ccna2Questions = applyAnswerPatches(normalizeQuestions(questionsCcna2 as Question[]));
