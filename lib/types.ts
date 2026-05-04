export type MatchPair = { left: string; right: string };

export type Question = {
  id: number;
  course?: "CCNA 1" | "CCNA 2";
  sourceId?: number;
  question: string;
  options: string[];
  correctAnswers: string[];
  /** Two-column table or label–description rows: match each left label to the correct right text */
  matchPairs?: MatchPair[];
  /**
   * "pair" (default): shuffle match UI (libellé ↔ description).
   * "ordering": table is an étape-numbered sequence; options/correctAnswers are the ordered steps; matchPairs kept for export/reuse.
   */
  pairMatchStyle?: "pair" | "ordering";
  explanation?: string;
  image?: string;
  /** Parser-only: set when the heading is in the HTML appendix (ftoc-appendix-*); stripped before JSON export */
  fromAppendix?: boolean;
};
