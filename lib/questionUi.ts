import { normalizeComparableText } from "@/lib/text";
import type { MatchPair, Question } from "@/lib/types";

/** Questions where the learner must recover the canonical order of every option */
export const ORDERING_INTENT_RE =
  /associez|appariez|faites\s+correspondre|correspondre|séquence|sequence|ordre|classer|rank|numéro.{0,14}étape|étapes?\s+qui\s+se\s+produisent|associer\s+chaque/i;

export function isPairMatchQuestion(q: Question): boolean {
  return !!q.matchPairs && q.matchPairs.length >= 2 && q.pairMatchStyle !== "ordering";
}

/** Table-based match / ordering items (HSRP, VLAN, liaison, DHCP, boot) — illustration often shows the solution */
export function isStructuredMatchTableQuestion(q: Question): boolean {
  return (
    !!q.matchPairs &&
    q.matchPairs.length >= 2 &&
    (isPairMatchQuestion(q) || q.pairMatchStyle === "ordering")
  );
}

export function isOrderingQuestion(q: Question): boolean {
  if (isPairMatchQuestion(q)) return false;
  if (
    q.pairMatchStyle === "ordering" &&
    q.matchPairs &&
    q.matchPairs.length >= 2 &&
    q.correctAnswers.length === q.options.length
  ) {
    return true;
  }
  return (
    ORDERING_INTENT_RE.test(q.question) &&
    q.options.length > 1 &&
    q.correctAnswers.length === q.options.length
  );
}

/** "Type - long description" rows (e.g. VLAN types) */
export function splitMatchArrowOption(option: string): { left: string; right: string } | null {
  const idx = option.indexOf(" - ");
  if (idx <= 0) return null;
  const left = option.slice(0, idx).trim();
  const right = option.slice(idx + 3).trim();
  if (left.length < 2 || left.length > 160 || right.length < 8) return null;
  return { left, right };
}

export function optionsUseMatchArrows(options: string[]): boolean {
  if (options.length < 2) return false;
  return options.every((o) => splitMatchArrowOption(o) !== null);
}

export type MatchPairPickResult = {
  left: string;
  expectedRight: string;
  chosenRight?: string;
  ok: boolean;
};

export function evaluateMatchPairPicks(pairs: MatchPair[], picks: Record<string, string>): MatchPairPickResult[] {
  return pairs.map(({ left, right }) => {
    const chosen = picks[left];
    return {
      left,
      expectedRight: right,
      chosenRight: chosen || undefined,
      ok: normalizeComparableText(chosen ?? "") === normalizeComparableText(right)
    };
  });
}

export function matchPairPicksAreCorrect(pairs: MatchPair[], picks: Record<string, string>): boolean {
  return evaluateMatchPairPicks(pairs, picks).every((r) => r.ok);
}
