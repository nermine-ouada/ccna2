/**
 * Reorders data/questions-ccna2.json: main sourceId 1–129 first, then appendix
 * in the same order as ccna2.html after the ===== separator.
 * Appendix sourceIds use 1000 + exam number, with special IDs for Q122 variants
 * and the cut-through match (no appendix number in text).
 */
const fs = require("fs");
const path = require("path");

const JSON_PATH = path.join(__dirname, "..", "data", "questions-ccna2.json");

const APPENDIX_ORDER = [
  33, 34, 49, 55, 59, 83, 88, 90, 93, 94, 95, 97, 98, 105, 119, 122, 132, 134, 135, 136, 139, 140, 141, 144, 147, 150, 154, 156, 158, 159, 160, 161, 162, 163, 165, 166, 167, 168, 169, 171, 172, 173
];

const NUMBERED_APPENDIX_IDS = {
  33: 297,
  49: 298,
  59: 299,
  83: 300,
  90: 301,
  93: 302,
  97: 303,
  105: 304,
  119: 305,
  94: 307,
  95: 308
};

function clone(q) {
  return JSON.parse(JSON.stringify(q));
}

function main() {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const byId = new Map(data.map((q) => [q.id, q]));

  const mainQs = data
    .filter((q) => q.sourceId >= 1 && q.sourceId <= 129)
    .sort((a, b) => a.sourceId - b.sourceId)
    .map(clone);

  const appendixTailIds = new Set(
    data.filter((q) => q.sourceId > 129).map((q) => q.id)
  );

  function findBySourceId(sid) {
    return data.find((q) => q.sourceId === sid);
  }

  /** Tail rows may already use 1000+N (re-run) or legacy 132–173. */
  function findTailByAppendixNum(N) {
    if (N >= 132 && N <= 173) {
      return (
        data.find((q) => q.sourceId === 1000 + N) || data.find((q) => q.sourceId === N)
      );
    }
    return undefined;
  }

  let nextId = Math.max(...data.map((q) => q.id), 0) + 1;

  const appendixOut = [];
  const usedIds = new Set();

  function pushAppendix(q, newSourceId) {
    if (!q) throw new Error("Missing question for appendix");
    const o = clone(q);
    o.sourceId = newSourceId;
    usedIds.add(q.id);
    appendixOut.push(o);
  }

  function pushCloneFromId(id, newSourceId, fixedCloneId) {
    const q = byId.get(id);
    if (!q) throw new Error(`Missing id ${id} for clone`);
    const o = clone(q);
    o.id = fixedCloneId != null ? fixedCloneId : nextId++;
    o.sourceId = newSourceId;
    appendixOut.push(o);
    usedIds.add(o.id);
  }

  for (const N of APPENDIX_ORDER) {
    if (N === 122) {
      // Cas 1–3 for appendix Q122; Cas 1 is id 315 (main Q122 is a different exam item at id 263).
      pushAppendix(byId.get(315), 1122);
      pushAppendix(byId.get(309), 1123);
      pushAppendix(byId.get(310), 1124);
      continue;
    }
    if (N === 34) {
      // Appendix-only IPv6 lien-local (id 311); main Q34 is VLAN/DTP (id 175).
      pushAppendix(byId.get(311), 1034);
      continue;
    }
    if (N === 55) {
      pushCloneFromId(196, 1055, 312);
      continue;
    }
    if (N === 88) {
      pushCloneFromId(229, 1088, 313);
      continue;
    }
    if (N === 98) {
      pushCloneFromId(243, 1098, 314);
      continue;
    }
    const numId = NUMBERED_APPENDIX_IDS[N];
    if (numId != null) {
      pushAppendix(byId.get(numId), 1000 + N);
      continue;
    }
    if (N >= 132 && N <= 173) {
      const q = findTailByAppendixNum(N);
      if (!q) throw new Error(`Appendix tail missing exam number ${N}`);
      pushAppendix(q, 1000 + N);
      continue;
    }
    throw new Error(`Unhandled appendix number ${N}`);
  }

  pushAppendix(byId.get(306), 1245);

  for (const id of appendixTailIds) {
    if (!usedIds.has(id)) {
      const q = byId.get(id);
      console.warn("Unused appendix tail question:", id, q?.sourceId, q?.question?.slice(0, 60));
    }
  }

  const out = [...mainQs, ...appendixOut];
  fs.writeFileSync(JSON_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log("Wrote", out.length, "questions (main", mainQs.length, "+ appendix", appendixOut.length, ")");
}

main();
