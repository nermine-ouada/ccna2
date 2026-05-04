/**
 * Injects ftoc-heading-{1..129} in the main bank, ftoc-appendix-{n} after the separator,
 * and replaces #ftwp-list: questions 1–129, =========, then appendix numbers in exam order.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const SEP = "<p>================================================</p>";

const APPENDIX_ORDER = (() => {
  const a = [
    33, 34, 49, 55, 59, 83, 88, 90, 93, 94, 95, 97, 98, 105, 119, 122, 132, 134, 135, 136, 139, 140, 141, 144, 147, 150, 154, 156, 158
  ];
  for (let n = 159; n <= 163; n++) a.push(n);
  for (let n = 165; n <= 169; n++) a.push(n);
  for (let n = 171; n <= 173; n++) a.push(n);
  return a;
})();

function patchHtml(raw) {
  const i = raw.indexOf(SEP);
  if (i === -1) throw new Error("Separator not found: " + SEP);

  let pre = raw.slice(0, i);
  let post = raw.slice(i);

  pre = pre.replace(/<h3 id="ftoc-heading-1"/g, '<h3 id="ftoc-heading-title"');

  pre = pre.replace(/<p><strong>(\d+)\./g, (full, d) => {
    const n = parseInt(d, 10);
    if (n >= 1 && n <= 129) {
      return `<p id="ftoc-heading-${n}" class="ftwp-heading"><strong>${n}.`;
    }
    return full;
  });

  post = post.replace(/<p><strong>(\d+)\./g, (_, d) => {
    return `<p id="ftoc-appendix-${d}" class="ftwp-heading"><strong>${d}.`;
  });

  post = post.replace(/<p><b>(\d+)\./g, (_, d) => {
    return `<p id="ftoc-appendix-${d}" class="ftwp-heading"><b>${d}.`;
  });

  let body = pre + post;

  const liMain = [];
  for (let n = 1; n <= 129; n++) {
    liMain.push(
      `<li class="ftwp-item"><a class="ftwp-anchor" href="#ftoc-heading-${n}"><span class="ftwp-text">${n}</span></a></li>`
    );
  }

  const liSep = `<li class="ftwp-item ftwp-toc-sep" aria-hidden="true"><span class="ftwp-text">=========</span></li>`;

  const liApp = APPENDIX_ORDER.map(
    (n) =>
      `<li class="ftwp-item"><a class="ftwp-anchor" href="#ftoc-appendix-${n}"><span class="ftwp-text">${n}</span></a></li>`
  );

  const inner = [...liMain, liSep, ...liApp].join("");

  body = body.replace(
    /<ol id="ftwp-list"[^>]*>[\s\S]*?<\/ol>/i,
    `<ol id="ftwp-list" class="ftwp-liststyle-none ftwp-effect-bounce-to-right ftwp-list-nest ftwp-strong-first ftwp-colexp ftwp-colexp-icon">${inner}</ol>`
  );

  const styleBlock = `<style id="ccna2-toc-custom">#ftwp-list.ftwp-liststyle-none { list-style: none; padding-left: 0; } #ftwp-list.ftwp-liststyle-none .ftwp-anchor::before { content: none !important; } .ftwp-toc-sep { list-style: none; } .ftwp-toc-sep .ftwp-text { font-weight: 700; }</style>`;
  if (!body.includes("ccna2-toc-custom")) {
    body = body.replace("</head>", `${styleBlock}\n</head>`);
  }

  return body;
}

for (const rel of ["public/ccna2.html", "ccna2.html"]) {
  const fp = path.join(ROOT, rel);
  if (!fs.existsSync(fp)) continue;
  const out = patchHtml(fs.readFileSync(fp, "utf8"));
  fs.writeFileSync(fp, out, "utf8");
  console.log("patched", rel);
}
