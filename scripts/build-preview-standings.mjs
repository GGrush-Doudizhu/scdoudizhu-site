import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = resolve("data-source/dsl1-preview/all_data.csv");
const outputPath = resolve("src/data/public-standings.json");
const checkOnly = process.argv.includes("--check");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function tierForRank(rank) {
  if (rank === 1) return "王者";
  if (rank <= 5) return "星耀";
  if (rank <= 15) return "钻石";
  return "铂金";
}

function pointsFor(role, won) {
  const isLandlord = role === "地主";
  if (isLandlord) return won ? 12 : 3;
  if (role === "富农" || role === "贫农") return won ? 8 : 2;
  throw new Error(`无法识别的身份：${role}`);
}

const source = await readFile(sourcePath, "utf8");
const [header, ...records] = parseCsv(source.replace(/^\uFEFF/, ""));
const columns = new Map(header.map((name, index) => [name, index]));

for (const required of ["Matchday", "PlayerName", "Won", "Role"]) {
  if (!columns.has(required)) throw new Error(`CSV 缺少列：${required}`);
}

const totals = new Map();
let firstMatchday = "99999999";
let lastMatchday = "00000000";

for (const record of records) {
  if (record.length !== header.length) {
    throw new Error(
      `CSV 列数异常：应为 ${header.length}，实际为 ${record.length}`,
    );
  }

  const matchday = record[columns.get("Matchday")];
  const name = record[columns.get("PlayerName")].trim();
  const role = record[columns.get("Role")].trim();
  const won = record[columns.get("Won")] === "1";
  firstMatchday = matchday < firstMatchday ? matchday : firstMatchday;
  lastMatchday = matchday > lastMatchday ? matchday : lastMatchday;
  totals.set(name, (totals.get(name) ?? 0) + pointsFor(role, won));
}

const entries = [...totals.entries()]
  .sort(([nameA, pointsA], [nameB, pointsB]) => {
    return pointsB - pointsA || nameA.localeCompare(nameB, "zh-CN");
  })
  .slice(0, 25)
  .map(([displayName, points], index) => ({
    rank: index + 1,
    displayName,
    points,
    tier: tierForRank(index + 1),
  }));

const output = `${JSON.stringify(
  {
    schemaVersion: 1,
    season: "dsl2",
    exportId: `dsl1-preview-${firstMatchday}-${lastMatchday}`,
    standingsAsOf: "2025-06-12T22:00:00+08:00",
    publishedAt: "2026-08-20T14:00:00+08:00",
    entries,
  },
  null,
  2,
)}\n`;

if (checkOnly) {
  const current = await readFile(outputPath, "utf8");
  if (current !== output) {
    throw new Error(
      "积分榜预览与 DSL1 数据源不一致，请运行 pnpm run build:preview-standings。",
    );
  }
  console.log(`积分榜预览校验通过：${entries.length} 名选手。`);
} else {
  await writeFile(outputPath, output, "utf8");
  console.log(`已生成积分榜预览：${entries.length} 名选手。`);
}
