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
  /** Bumps each time random deck is turned on so each shuffle gets its own saved session. */
  randomDeckNonce?: number;
  index: number;
  score: number;
  answers: Record<string, QuizQuestionPersist>;
};

const PREFIX = "ccna-quiz-session";

export function quizStorageKey(
  course: string,
  randomMode: boolean,
  deckKey: string,
  randomDeckNonce = 0
): string {
  const shufflePart =
    randomMode && randomDeckNonce > 0 ? `|S${randomDeckNonce}` : "";
  return `${PREFIX}|${course}|${randomMode ? "R" : "O"}|${deckKey}${shufflePart}`;
}

export function loadQuizSession(
  course: "CCNA 1" | "CCNA 2",
  randomMode: boolean,
  deckKey: string,
  randomDeckNonce = 0
): QuizSessionV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(quizStorageKey(course, randomMode, deckKey, randomDeckNonce));
    if (!raw) return null;
    const data = JSON.parse(raw) as QuizSessionV1;
    if (data?.v !== 1 || !data.answers) return null;
    if (data.course !== course || data.randomMode !== randomMode || data.deckKey !== deckKey) return null;
    const storedNonce = data.randomDeckNonce ?? 0;
    if (randomMode && randomDeckNonce > 0 && storedNonce !== randomDeckNonce) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveQuizSession(session: QuizSessionV1): void {
  if (typeof window === "undefined") return;
  try {
    const nonce = session.randomDeckNonce ?? 0;
    localStorage.setItem(
      quizStorageKey(session.course, session.randomMode, session.deckKey, nonce),
      JSON.stringify(session)
    );
  } catch {
    /* quota or private mode */
  }
}
