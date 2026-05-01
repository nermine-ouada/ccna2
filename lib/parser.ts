import { load } from "cheerio";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Question } from "./types";
import { stripStepPrefix } from "./text";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_ALL_JSON_PATH = path.join(ROOT_DIR, "data", "questions.json");
const OUTPUT_CCNA1_JSON_PATH = path.join(ROOT_DIR, "data", "questions-ccna1.json");
const OUTPUT_CCNA2_JSON_PATH = path.join(ROOT_DIR, "data", "questions-ccna2.json");
const SOURCE_FILES = [
  { file: "ccna1.html", course: "CCNA 1" as const },
  { file: "ccna2.html", course: "CCNA 2" as const }
];

function cleanText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeForMatch(input: string): string {
  return cleanText(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function inferCorrectAnswersFromExplanation(options: string[], explanation?: string): string[] {
  if (!explanation || options.length === 0) return [];

  const normalizedExplanation = normalizeForMatch(explanation);
  const inferred = options.filter((option) => {
    const normalizedOption = normalizeForMatch(option);
    if (normalizedOption.length < 12) return false;
    return normalizedExplanation.includes(normalizedOption);
  });

  return [...new Set(inferred)];
}

async function parseQuestionsFromHtml(
  htmlPath: string,
  course: "CCNA 1" | "CCNA 2",
  idStart: number
): Promise<Question[]> {
  const html = await fs.readFile(htmlPath, "utf8");
  const $ = load(html);

  const questions: Question[] = [];
  let generatedId = idStart;

  $("p, strong, b").each((_, el) => {
    const node = $(el);
    const tagName = (el.tagName || "").toLowerCase();

    let initialText = "";
    if (tagName === "p") {
      const firstBold = node.find("strong, b").first();
      initialText = firstBold.length ? cleanText(firstBold.text()) : cleanText(node.text());
    } else {
      initialText = cleanText(node.text());
    }
    if (!initialText) return;

    const idMatch = initialText.match(/^(\d+)\s*[.)]?\s*/);
    if (!idMatch) return;
    const sourceId = Number(idMatch[1]);
    if (!Number.isFinite(sourceId)) return;
    let questionText = initialText.replace(/^\d+\s*[.)]?\s*/, "");
    if (!questionText) return;

    const pNode = node.closest("p");
    const startNode = tagName === "p" ? node : pNode.length ? pNode : node;

    let next = startNode.next();
    const optionItems: string[] = [];
    const correctAnswers: string[] = [];
    const tableAnswerRows: string[] = [];
    let image: string | undefined;
    let explanation: string | undefined;

    while (next.length) {
      if (next.is("p")) {
        const nextBold = next.find("strong, b").first();
        const candidateText = nextBold.length
          ? cleanText(nextBold.text())
          : cleanText(next.text());
        const numberedMatch = candidateText.match(/^(\d+)\s*[.)]?\s*/);
        if (numberedMatch) break;

        // Continue the same question when an extra unnumbered bold line follows.
        if (nextBold.length && candidateText) {
          questionText = cleanText(`${questionText} ${candidateText}`);
        }
        next = next.next();
        continue;
      }

      if (!image) {
        const img = next.find("img").first();
        if (img.length) {
          image = cleanText(img.attr("src") ?? "");
        }
      }

      if (next.is("ul")) {
        next.find("li").each((__, li) => {
          const text = stripStepPrefix(cleanText($(li).text()));
          if (!text) return;
          optionItems.push(text);
          if ($(li).hasClass("correct_answer")) {
            correctAnswers.push(text);
          }
        });
      }

      // Some questions are represented as table rows instead of list options.
      // Keep raw row text so these questions are not dropped.
      if (next.is("table")) {
        next.find("tr").each((__, tr) => {
          const cells = $(tr)
            .find("td,th")
            .map((___, cell) => cleanText($(cell).text()))
            .get()
            .filter(Boolean);
          if (cells.length) {
            const rowText = stripStepPrefix(cells.join(" - "));
            optionItems.push(rowText);
            tableAnswerRows.push(rowText);
          }
        });
      }

      if (next.is("div.message_box.announce")) {
        const explanationText = cleanText(next.text());
        if (explanationText) explanation = explanationText;
      }

      next = next.next();
    }

    // For matching/ranking questions represented as table rows after an image,
    // use the ordered table rows as correct answers when no explicit li.correct_answer exists.
    if (correctAnswers.length === 0 && tableAnswerRows.length > 0) {
      correctAnswers.push(...tableAnswerRows);
    }
    if (correctAnswers.length === 0) {
      correctAnswers.push(...inferCorrectAnswersFromExplanation(optionItems, explanation));
    }

    if (!questionText) {
      return;
    }

    questions.push({
      id: generatedId,
      course,
      sourceId,
      question: questionText,
      options: optionItems,
      correctAnswers,
      ...(explanation ? { explanation } : {}),
      ...(image ? { image } : {})
    });
    generatedId += 1;
  });

  return questions;
}

function dedupeBySourceId(questions: Question[]): Question[] {
  const bySourceId = new Map<number, Question>();
  for (const question of questions) {
    if (!question.sourceId) continue;
    const current = bySourceId.get(question.sourceId);
    if (!current) {
      bySourceId.set(question.sourceId, question);
      continue;
    }

    const currentScore =
      (current.correctAnswers?.length ?? 0) * 4 +
      (current.options?.length ?? 0) +
      (current.explanation ? 1 : 0);
    const nextScore =
      (question.correctAnswers?.length ?? 0) * 4 +
      (question.options?.length ?? 0) +
      (question.explanation ? 1 : 0);

    if (nextScore > currentScore) {
      bySourceId.set(question.sourceId, question);
    }
  }

  return [...bySourceId.values()].sort((a, b) => (a.sourceId ?? 0) - (b.sourceId ?? 0));
}

async function main() {
  const parsed: Question[] = [];
  const parsedByCourse: Record<"CCNA 1" | "CCNA 2", Question[]> = {
    "CCNA 1": [],
    "CCNA 2": []
  };
  let nextId = 1;

  for (const source of SOURCE_FILES) {
    const sourcePath = path.join(ROOT_DIR, source.file);
    try {
      await fs.access(sourcePath);
      const batchRaw = await parseQuestionsFromHtml(sourcePath, source.course, nextId);
      const batch = dedupeBySourceId(batchRaw).map((question, i) => ({
        ...question,
        id: nextId + i
      }));
      parsed.push(...batch);
      parsedByCourse[source.course].push(...batch);
      nextId += batch.length;
      console.log(`Parsed ${batch.length} unique from ${source.file} (raw: ${batchRaw.length})`);
    } catch {
      console.log(`Skipped missing file: ${source.file}`);
    }
  }

  await fs.mkdir(path.dirname(OUTPUT_ALL_JSON_PATH), { recursive: true });
  await Promise.all([
    fs.writeFile(OUTPUT_ALL_JSON_PATH, JSON.stringify(parsed, null, 2), "utf8"),
    fs.writeFile(
      OUTPUT_CCNA1_JSON_PATH,
      JSON.stringify(parsedByCourse["CCNA 1"], null, 2),
      "utf8"
    ),
    fs.writeFile(
      OUTPUT_CCNA2_JSON_PATH,
      JSON.stringify(parsedByCourse["CCNA 2"], null, 2),
      "utf8"
    )
  ]);
  console.log(`Parsed ${parsed.length} questions into ${OUTPUT_ALL_JSON_PATH}`);
  console.log(
    `Split files: ${parsedByCourse["CCNA 1"].length} -> ${OUTPUT_CCNA1_JSON_PATH}, ${parsedByCourse["CCNA 2"].length} -> ${OUTPUT_CCNA2_JSON_PATH}`
  );
}

main().catch((error) => {
  console.error("Failed to parse HTML:", error);
  process.exit(1);
});
