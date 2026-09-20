import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sponsorSchema = z.strictObject({
  name: z.string().trim().min(1),
  tier: z.enum(["platinum", "diamond", "gold", "silver"]),
  avatar: z.string().regex(/^\/assets\/sponsors\/dsl2\/[\w.-]+\.webp$/u),
});
const ledgerSchema = z.strictObject({
  currency: z.literal("CNY"),
  transactions: z
    .array(
      z.strictObject({
        sponsor: z.string().min(1),
        amount: z
          .number()
          .positive()
          .refine(
            (amount) =>
              Number.isSafeInteger(Math.round(amount * 100)) &&
              Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-8,
            "金额最多保留两位小数，且必须能安全转换为分。",
          ),
        purpose: z.string().trim().min(1),
        status: z.literal("已收到"),
        received_date: z.iso.date().nullable(),
        recorded_date: z.iso.date().nullable(),
      }),
    )
    .min(1),
});

const sponsors = z
  .array(sponsorSchema)
  .min(1)
  .parse(
    JSON.parse(
      await readFile(
        path.join(projectRoot, "src/data/dsl2-sponsor-profiles.json"),
        "utf8",
      ),
    ),
  );
const ledger = ledgerSchema.parse(
  JSON.parse(
    await readFile(
      path.join(
        projectRoot,
        "data-source/dsl2-sponsors/sponsorship-ledger.json",
      ),
      "utf8",
    ),
  ),
);
const sponsorNames = new Set(sponsors.map((sponsor) => sponsor.name));
assert.equal(sponsorNames.size, sponsors.length, "赞助商昵称不能重复。");
const totals = new Map(sponsors.map((sponsor) => [sponsor.name, 0]));
for (const [index, entry] of ledger.transactions.entries()) {
  assert(
    sponsorNames.has(entry.sponsor),
    `第 ${index + 1} 笔流水引用了未知赞助商：${entry.sponsor}`,
  );
  if (entry.received_date && entry.recorded_date) {
    assert(
      entry.received_date <= entry.recorded_date,
      `第 ${index + 1} 笔流水的建档日期早于到账日期。`,
    );
  }
  totals.set(
    entry.sponsor,
    totals.get(entry.sponsor) + Math.round(entry.amount * 100),
  );
}
let totalCents = 0;
for (const sponsor of sponsors) {
  await access(path.join(projectRoot, "public", sponsor.avatar));
  const cents = totals.get(sponsor.name);
  assert(cents > 0, `赞助商 ${sponsor.name} 缺少到账流水。`);
  totalCents += cents;
  assert(Number.isSafeInteger(totalCents), "赞助总额超出安全整数范围。");
  console.log(`${sponsor.name}：${(cents / 100).toFixed(2)} 元`);
}
console.log(
  `赞助流水验证通过：${ledger.transactions.length} 笔，${sponsors.length} 位赞助者，总额 ${(totalCents / 100).toFixed(2)} 元。`,
);
