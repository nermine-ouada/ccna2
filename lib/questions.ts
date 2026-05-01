import questionsAll from "@/data/questions.json";
import questionsCcna1 from "@/data/questions-ccna1.json";
import questionsCcna2 from "@/data/questions-ccna2.json";
import { Question } from "@/lib/types";
import { stripStepPrefix } from "@/lib/text";

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function normalizeQuestions(raw: Question[]): Question[] {
  return raw.map((question) => {
    const options = unique(question.options.map(stripStepPrefix).filter(Boolean));
    const correctAnswers = unique(question.correctAnswers.map(stripStepPrefix).filter(Boolean));
    const mergedOptions = options.length > 0 ? unique([...options, ...correctAnswers]) : correctAnswers;

    return {
      ...question,
      options: mergedOptions,
      correctAnswers
    };
  });
}

export const allQuestions = normalizeQuestions(questionsAll as Question[]);
export const ccna1Questions = normalizeQuestions(questionsCcna1 as Question[]);
export const ccna2Questions = normalizeQuestions(questionsCcna2 as Question[]);
