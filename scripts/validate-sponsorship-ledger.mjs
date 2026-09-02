import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const ledgerPath = path.join(
  projectRoot,
  "data-source",
  "dsl2-sponsors",
  "sponsorship-ledger.csv",
);

const expectedHeaders = [
  "transaction_id",
  "sponsor_name",
  "amount_cny",
  "currency",
  "purpose",
  "status",
  "received_date",
  "recorded_date",
  "public_tier",
];
const allowedTiers = new Set([
  "铂金赞助商",
  "钻石赞助商",
  "黄金赞助商",
  "白银赞助商",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  assert(!quoted, "赞助流水 CSV 存在未闭合的引号。");
  return rows;
}

const rawText = (await readFile(ledgerPath, "utf8")).replace(/^\uFEFF/u, "");
const [headers, ...rows] = parseCsv(rawText);

assert(
  JSON.stringify(headers) === JSON.stringify(expectedHeaders),
  `赞助流水字段不符合约定。实际字段：${headers?.join(", ") ?? "无"}`,
);
assert(rows.length > 0, "赞助流水不能为空。");

const transactionIds = new Set();
const sponsors = new Set();
let totalCents = 0;

rows.forEach((row, index) => {
  const line = index + 2;
  assert(row.length === headers.length, `第 ${line} 行字段数量不正确。`);
  const entry = Object.fromEntries(
    headers.map((header, column) => [header, row[column]]),
  );

  assert(entry.transaction_id.trim(), `第 ${line} 行缺少流水编号。`);
  assert(
    !transactionIds.has(entry.transaction_id),
    `流水编号 ${entry.transaction_id} 重复。`,
  );
  transactionIds.add(entry.transaction_id);

  assert(entry.sponsor_name.trim(), `第 ${line} 行缺少赞助者昵称。`);
  sponsors.add(entry.sponsor_name.trim());
  assert(
    /^\d+\.\d{2}$/u.test(entry.amount_cny),
    `第 ${line} 行金额必须是保留两位小数的正数。`,
  );
  const [yuan, cents] = entry.amount_cny.split(".").map(Number);
  const amountCents = yuan * 100 + cents;
  assert(amountCents > 0, `第 ${line} 行金额必须大于零。`);
  totalCents += amountCents;

  assert(entry.currency === "CNY", `第 ${line} 行币种必须是 CNY。`);
  assert(entry.purpose.trim(), `第 ${line} 行缺少赞助用途。`);
  assert(entry.status === "已收到", `第 ${line} 行状态必须是“已收到”。`);
  assert(
    !entry.received_date || /^\d{4}-\d{2}-\d{2}$/u.test(entry.received_date),
    `第 ${line} 行到账日期格式必须是 YYYY-MM-DD 或留空。`,
  );
  assert(
    /^\d{4}-\d{2}-\d{2}$/u.test(entry.recorded_date),
    `第 ${line} 行建档日期格式必须是 YYYY-MM-DD。`,
  );
  assert(
    allowedTiers.has(entry.public_tier),
    `第 ${line} 行公开档位不在允许范围内。`,
  );
});

console.log(
  `赞助流水验证通过：${rows.length} 笔，${sponsors.size} 位赞助者，总额 ${(totalCents / 100).toFixed(2)} 元。`,
);
