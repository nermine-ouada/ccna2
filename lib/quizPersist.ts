export type QuizQuestionPersist = {
  selected: string[];
  pairPicks: Record<string, string>;
  revealed: boolean;
  /** True after Submit once for this attempt (cleared on Redo). */
  scored: boolean;
};

export type QuizSessionV1 = {
  v: 1;
  course: "CCNA 1" | "CCNA 2";
  randomMode: boolean;
  deckKey: string;
  index: number;
  score: number;
  answers: Record<string, QuizQuestionPersist>;
};

const PREFIX = "ccna-quiz-session";

export function quizStorageKey(course: string, randomMode: boolean, deckKey: string): string {
  return `${PREFIX}|${course}|${randomMode ? "R" : "O"}|${deckKey}`;
}

export function loadQuizSession(
  course: "CCNA 1" | "CCNA 2",
  randomMode: boolean,
  deckKey: string
): QuizSessionV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(quizStorageKey(course, randomMode, deckKey));
    if (!raw) return null;
    const data = JSON.parse(raw) as QuizSessionV1;
    if (data?.v !== 1 || !data.answers) return null;
    if (data.course !== course || data.randomMode !== randomMode || data.deckKey !== deckKey) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveQuizSession(session: QuizSessionV1): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      quizStorageKey(session.course, session.randomMode, session.deckKey),
      JSON.stringify(session)
    );
  } catch {
    /* quota or private mode */
  }
}
