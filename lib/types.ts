export type Question = {
  id: number;
  course?: "CCNA 1" | "CCNA 2";
  sourceId?: number;
  question: string;
  options: string[];
  correctAnswers: string[];
  explanation?: string;
  image?: string;
};
