export function stripStepPrefix(input: string): string {
  return input
    .replace(/^\s*(?:[Ee]tape|[Éé]tape)\s*\d+\s*[-.:]?\s*/u, "")
    .replace(/^\s*step\s*\d+\s*[-.:]?\s*/iu, "")
    .trim();
}

/** Compare option / match strings across minor Unicode or spacing differences */
export function normalizeComparableText(input: string): string {
  return input.normalize("NFC").replace(/\s+/g, " ").trim();
}
