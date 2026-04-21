import { load } from "cheerio";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Question } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const SOURCE_HTML_PATH = path.join(ROOT_DIR, "ccna2.html");
const OUTPUT_JSON_PATH = path.join(ROOT_DIR, "data", "questions.json");

function cleanText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

async function parseQuestionsFromHtml(): Promise<Question[]> {
  const html = await fs.readFile(SOURCE_HTML_PATH, "utf8");
  const $ = load(html);

  const questions: Question[] = [];

  $("p > strong").each((_, el) => {
    const questionText = cleanText($(el).text());
    if (!questionText) return;

    const pNode = $(el).closest("p");
    const idMatch = questionText.match(/^(\d+)\.\s*/);
    const fallbackId = questions.length + 1;
    const id = idMatch ? Number(idMatch[1]) : fallbackId;

    let next = pNode.next();
    const optionItems: string[] = [];
    const correctAnswers: string[] = [];
    let image: string | undefined;
    let explanation: string | undefined;

    while (next.length) {
      if (next.is("p") && next.find("strong").length > 0) break;

      if (!image) {
        const img = next.find("img").first();
        if (img.length) {
          image = cleanText(img.attr("src") ?? "");
        }
      }

      if (next.is("ul")) {
        next.find("li").each((__, li) => {
          const text = cleanText($(li).text());
          if (!text) return;
          optionItems.push(text);
          if ($(li).hasClass("correct_answer")) {
            correctAnswers.push(text);
          }
        });
      }

      if (next.is("div.message_box.announce")) {
        const explanationText = cleanText(next.text());
        if (explanationText) explanation = explanationText;
      }

      next = next.next();
    }

    if (optionItems.length === 0) return;

    questions.push({
      id,
      question: questionText.replace(/^\d+\.\s*/, ""),
      options: optionItems,
      correctAnswers,
      ...(explanation ? { explanation } : {}),
      ...(image ? { image } : {})
    });
  });

  return questions;
}

async function main() {
  const parsed = await parseQuestionsFromHtml();
  await fs.mkdir(path.dirname(OUTPUT_JSON_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_JSON_PATH, JSON.stringify(parsed, null, 2), "utf8");
  console.log(`Parsed ${parsed.length} questions into ${OUTPUT_JSON_PATH}`);
}

main().catch((error) => {
  console.error("Failed to parse HTML:", error);
  process.exit(1);
});
