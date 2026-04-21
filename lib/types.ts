export type Question = {
  id: number;
  question: string;
  options: string[];
  correctAnswers: string[];
  explanation?: string;
  image?: string;
};
