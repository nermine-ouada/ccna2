export function stripStepPrefix(input: string): string {
  return input.replace(/^\s*(?:[Ee]tape|[Éé]tape)\s*\d+\s*[-.:]?\s*/u, "").trim();
}
