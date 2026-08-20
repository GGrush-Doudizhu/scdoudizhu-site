import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const standingsPath = path.join(
  projectRoot,
  "src",
  "data",
  "public-standings.json",
);

const allowedRootKeys = [
  "entries",
  "exportId",
  "publishedAt",
  "schemaVersion",
  "season",
  "standingsAsOf",
];
const allowedEntryKeys = ["displayName", "points", "rank", "tier"];
const allowedTiers = new Set([
  "王者",
  "星耀",
  "钻石",
  "铂金",
  "黄金",
  "白银",
  "青铜",
]);
const forbiddenKeyPattern =
  /(player.?id|slot.?id|room.?id|contact|phone|wechat|qq|alias|replay)/iu;
const forbiddenExtensions = new Set([".rep", ".zip", ".xlsx", ".xls"]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertExactKeys(value, allowedKeys, location) {
  const actualKeys = Object.keys(value).sort();
  assert(
    JSON.stringify(actualKeys) === JSON.stringify([...allowedKeys].sort()),
    `${location} 字段不符合白名单。实际字段：${actualKeys.join(", ")}`,
  );
}

function scanKeys(value, location = "root") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanKeys(item, `${location}[${index}]`));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    assert(
      !forbiddenKeyPattern.test(key),
      `${location}.${key} 命中公开数据禁止字段规则。`,
    );
    scanKeys(child, `${location}.${key}`);
  }
}

async function scanForbiddenFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await scanForbiddenFiles(absolutePath);
      continue;
    }

    const extension = path.extname(entry.name).toLocaleLowerCase("en-US");
    assert(
      !forbiddenExtensions.has(extension),
      `${path.relative(projectRoot, absolutePath)} 是公开站点源码中的禁止文件类型。`,
    );
  }
}

const rawText = await readFile(standingsPath, "utf8");
const standings = JSON.parse(rawText);

assertExactKeys(standings, allowedRootKeys, "积分榜根对象");
scanKeys(standings);
assert(standings.schemaVersion === 1, "schemaVersion 必须为 1。 ");
assert(standings.season === "dsl2", "season 必须为 dsl2。 ");
assert(
  typeof standings.exportId === "string" && standings.exportId.trim(),
  "exportId 不能为空。 ",
);
assert(Array.isArray(standings.entries), "entries 必须是数组。 ");

if (standings.entries.length > 0) {
  assert(
    typeof standings.standingsAsOf === "string",
    "非空积分榜必须有 standingsAsOf。 ",
  );
  assert(
    typeof standings.publishedAt === "string",
    "非空积分榜必须有 publishedAt。 ",
  );
}

const normalizedNames = new Set();
let previousRank = 0;

standings.entries.forEach((entry, index) => {
  const location = `entries[${index}]`;
  assertExactKeys(entry, allowedEntryKeys, location);
  assert(
    Number.isInteger(entry.rank) && entry.rank > 0,
    `${location}.rank 必须是正整数。`,
  );
  assert(entry.rank >= previousRank, `${location}.rank 必须按升序排列。`);
  previousRank = entry.rank;
  assert(
    typeof entry.displayName === "string" &&
      entry.displayName.trim().length > 0,
    `${location}.displayName 不能为空。`,
  );
  assert(
    entry.displayName.length <= 40,
    `${location}.displayName 不能超过 40 个字符。`,
  );
  assert(
    !/[\u0000-\u001f\u007f]/u.test(entry.displayName),
    `${location}.displayName 含控制字符。`,
  );
  assert(
    Number.isInteger(entry.points) && entry.points >= 0,
    `${location}.points 必须是非负整数。`,
  );
  assert(allowedTiers.has(entry.tier), `${location}.tier 不是允许的段位。`);

  const normalizedName = entry.displayName.trim().toLocaleLowerCase("zh-CN");
  assert(
    !normalizedNames.has(normalizedName),
    `${location}.displayName 与其他选手重复。`,
  );
  normalizedNames.add(normalizedName);
});

await scanForbiddenFiles(path.join(projectRoot, "src"));
await scanForbiddenFiles(path.join(projectRoot, "public")).catch((error) => {
  if (error?.code !== "ENOENT") {
    throw error;
  }
});

console.log(
  `公开数据验证通过：${standings.entries.length} 条积分记录，未发现越界字段或禁止文件。`,
);
