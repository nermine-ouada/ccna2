import questionsAll from "@/data/questions.json";
import questionsCcna1 from "@/data/questions-ccna1.json";
import questionsCcna2 from "@/data/questions-ccna2.json";
import { Question } from "@/lib/types";

export const allQuestions = questionsAll as Question[];
export const ccna1Questions = questionsCcna1 as Question[];
export const ccna2Questions = questionsCcna2 as Question[];
