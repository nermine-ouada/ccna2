import { load } from "cheerio";
import type { Element as DomhandlerElement } from "domhandler";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MatchPair, Question } from "./types";
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
    if (normalizedOption.length < 3) return false;
    if (normalizedOption.length >= 12) return normalizedExplanation.includes(normalizedOption);
    // Short options (e.g. SSH, IMAP): match as whole word in explanation
    const re = new RegExp(`(?:^|[^a-z0-9])${normalizedOption.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9])`, "i");
    return re.test(normalizedExplanation);
  });

  return [...new Set(inferred)];
}

/** Some pages mark correct choices only with inline red styling instead of li.correct_answer */
function liLooksCorrect($: ReturnType<typeof load>, li: DomhandlerElement): boolean {
  const el = $(li);
  if (el.hasClass("correct_answer")) return true;
  if (el.find(".correct_answer").length > 0) return true;
  const styled = el.find("[style]").addBack("[style]");
  for (let i = 0; i < styled.length; i += 1) {
    const st = (styled.eq(i).attr("style") || "").toLowerCase().replace(/\s/g, "");
    if (
      st.includes("#ff0000") ||
      st.includes("ff0000") ||
      st.includes("rgb(255,0,0)") ||
      st.includes("color:red")
    ) {
      return true;
    }
  }
  return false;
}

/** Subnet matching questions sometimes only have answers in the explanation text */
function inferSubnetAnswersFromExplanation(question: string, explanation?: string): string[] {
  if (!explanation) return [];
  if (!/associez|adresses?\s+ip|préfix|hôte|réseau\s+[abcd]/i.test(question)) return [];
  const answers: string[] = [];
  const re = /(\d+\.\d+\.\d+\.\d+)\s*\/(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(explanation)) !== null) {
    answers.push(`${match[1]} /${match[2]}`);
  }
  return [...new Set(answers)];
}

/** Image-only “Associez / Faites correspondre” items often spell out the mapping in the explanation paragraph */
function inferAssociezFromExplanation(question: string, explanation?: string): string[] {
  if (!explanation) return [];
  if (!/associez|faire correspondre|faites correspondre/i.test(question)) return [];
  const body = cleanText(explanation.replace(/^(Explique|Explication)\s*:?\s*/i, ""));
  const sentences = body
    .split(/\.\s+/)
    .map((s) => cleanText(s))
    .filter((s) => s.length > 40);
  if (sentences.length < 2) return [];
  return sentences.map((s) => (s.endsWith(".") ? s : `${s}.`));
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
    if (sourceId < 1 || sourceId > 200) return;
    let questionText = initialText.replace(/^\d+\s*[.)]?\s*/, "");
    if (!questionText) return;

    const pNode = node.closest("p");
    const startNode = tagName === "p" ? node : pNode.length ? pNode : node;

    let next = startNode.next();
    const optionItems: string[] = [];
    const correctAnswers: string[] = [];
    const tableAnswerRows: string[] = [];
    let tableMatchPairs: MatchPair[] | undefined;
    let pairMatchStyle: "ordering" | undefined;
    let image: string | undefined;
    let explanation: string | undefined;

    if (!image) {
      const imgInQuestion = startNode.find("img").first();
      if (imgInQuestion.length) {
        image = cleanText(imgInQuestion.attr("src") ?? "");
      }
    }

    while (next.length) {
      if (next.is("p")) {
        if (!image) {
          const imgInP = next.find("img").first();
          if (imgInP.length) {
            image = cleanText(imgInP.attr("src") ?? "");
          }
        }

        const nextBold = next.find("strong, b").first();
        const candidateText = nextBold.length
          ? cleanText(nextBold.text())
          : cleanText(next.text());
        const numberedMatch = candidateText.match(/^(\d+)\s*[.)]?\s*/);
        if (numberedMatch) break;

        const innerCorrect = next.find(".correct_answer");
        if (innerCorrect.length) {
          const choice = stripStepPrefix(cleanText(innerCorrect.first().text()));
          if (choice) {
            optionItems.push(choice);
            correctAnswers.push(choice);
          }
          next = next.next();
          continue;
        }

        const plain = stripStepPrefix(cleanText(next.text()));
        if (
          plain.length > 40 &&
          !nextBold.length &&
          /adresse|couch|172\.|192\.|10\.|00-00|00:00/i.test(plain)
        ) {
          optionItems.push(plain);
          next = next.next();
          continue;
        }

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
          if (liLooksCorrect($, li)) {
            correctAnswers.push(text);
          }
        });
      }

      // Two-column tables:
      // - "Étape N" / "Step N" + description = ordered sequence (options = right column), plus matchPairs + pairMatchStyle "ordering" for JSON/export.
      // - Otherwise exactly 2 columns = label | description pairs (matching), matchPairs + "left - right" options.
      // - Other tables: one option per row (joined cells).
      if (next.is("table")) {
        const rows: string[][] = [];
        next.find("tr").each((__, tr) => {
          const cells = $(tr)
            .find("td,th")
            .map((___, cell) => cleanText($(cell).text()))
            .get()
            .filter((t) => t.trim().length > 0);
          if (cells.length) rows.push(cells);
        });
        const allTwoColsRaw = rows.length >= 2 && rows.every((cells) => cells.length === 2);
        const isEtapeSequenceTable =
          allTwoColsRaw &&
          rows.every(([left]) =>
            /^(?:[Ee]tape|[Éé]tape|step)\s*\d+$/iu.test(left.trim())
          );

        if (isEtapeSequenceTable) {
          tableMatchPairs = rows.map(([left, right]) => ({
            left: left.trim(),
            right: stripStepPrefix(right.trim())
          }));
          pairMatchStyle = "ordering";
          for (const [, right] of rows) {
            const text = stripStepPrefix(right.trim());
            optionItems.push(text);
            tableAnswerRows.push(text);
          }
        } else if (allTwoColsRaw) {
          const pairs: MatchPair[] = rows.map(([left, right]) => ({
            left: stripStepPrefix(left.trim()) || left.trim(),
            right: stripStepPrefix(right.trim())
          }));
          tableMatchPairs = pairs;
          for (const { left, right } of pairs) {
            const rowText = `${left} - ${right}`;
            optionItems.push(rowText);
            tableAnswerRows.push(rowText);
          }
        } else {
          for (const cells of rows) {
            const rowText = stripStepPrefix(cells.map((c) => c.trim()).join(" - "));
            optionItems.push(rowText);
            tableAnswerRows.push(rowText);
          }
        }
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
    if (correctAnswers.length === 0 && optionItems.length === 0) {
      const inferredSubs = inferSubnetAnswersFromExplanation(questionText, explanation);
      optionItems.push(...inferredSubs);
      correctAnswers.push(...inferredSubs);
    }
    if (correctAnswers.length === 0 && optionItems.length === 0) {
      const assoc = inferAssociezFromExplanation(questionText, explanation);
      if (assoc.length >= 2) {
        optionItems.push(...assoc);
        correctAnswers.push(...assoc);
      }
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
      ...(tableMatchPairs?.length ? { matchPairs: tableMatchPairs } : {}),
      ...(pairMatchStyle ? { pairMatchStyle } : {}),
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
      (current.matchPairs?.length ?? 0) * 10 +
      (current.explanation ? 1 : 0);
    const nextScore =
      (question.correctAnswers?.length ?? 0) * 4 +
      (question.options?.length ?? 0) +
      (question.matchPairs?.length ?? 0) * 10 +
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
