import { expect, test } from "@playwright/test";
import {
  publicStandings,
  publicStandingsSchema,
} from "../src/schemas/public-standings";
import matchReports from "../src/data/match-reports.json" with { type: "json" };

// Independent expectations from the administrator's seven rank bands.
const rankBands = [
  [1, "王者"],
  [5, "星耀"],
  [10, "钻石"],
  [20, "铂金"],
  [30, "黄金"],
  [40, "白银"],
  [Infinity, "青铜"],
] as const;

function standingsWithPlayers(count: number) {
  return {
    ...publicStandings,
    entries: Array.from({ length: count }, (_, index) => ({
      rank: index + 1,
      displayName: `选手${index + 1}`,
      points: count - index,
      tier: rankBands.find(([maximum]) => index + 1 <= maximum)![1],
      ...(index < 5 ? { gamesPlayed: 10, winRate: 0.5 } : {}),
    })),
  };
}

test("公开榜完整覆盖累计前四十名及全部同分选手", () => {
  const totals = new Map<string, number>();
  for (const day of matchReports.matchDays) {
    for (const player of day.pointChanges) {
      totals.set(
        player.displayName,
        (totals.get(player.displayName) ?? 0) + player.total,
      );
    }
  }
  const expected = [...totals.entries()]
    .sort(
      ([nameA, pointsA], [nameB, pointsB]) =>
        pointsB - pointsA || nameA.localeCompare(nameB, "zh-CN"),
    )
    .map(([name, points]) => [
      name,
      points,
      1 + [...totals.values()].filter((score) => score > points).length,
    ])
    .filter(([, , rank]) => Number(rank) <= 40);
  expect(
    publicStandings.entries.map(({ displayName, points, rank }) => [
      displayName,
      points,
      rank,
    ]),
  ).toEqual(expected);
  for (const player of publicStandings.entries) {
    expect(player.points).toBe(totals.get(player.displayName));
    expect(player.tier).toBe(
      rankBands.find(([maximum]) => player.rank <= maximum)![1],
    );
    expect(player.tier).not.toBe("青铜");
  }
});

test("公开范围限制名次而非人数，拒绝第41名及以后", () => {
  for (const count of [0, 5, 30, 40]) {
    const result = publicStandingsSchema.parse(standingsWithPlayers(count));
    expect(result.entries).toHaveLength(count);
  }
  for (const count of [41, 50, 65, 80]) {
    expect(
      publicStandingsSchema.safeParse(standingsWithPlayers(count)).success,
    ).toBe(false);
  }
});

test("所有段位边界同分同段位，随后跳号且统计字段随段位公开", () => {
  for (const boundary of [1, 5, 10, 20, 30, 40]) {
    const data = standingsWithPlayers(boundary + 2);
    // The two boundary players tie; the next player keeps boundary + 2.
    const leader = data.entries[boundary - 1];
    const tied = data.entries[boundary];
    Object.assign(tied, {
      points: leader.points,
      rank: boundary,
      tier: leader.tier,
    });
    if (boundary <= 5) Object.assign(tied, { gamesPlayed: 10, winRate: 0.5 });
    data.entries = data.entries.filter((entry) => entry.rank <= 40);
    expect(publicStandingsSchema.safeParse(data).success).toBe(true);
    if (boundary < 40)
      expect(data.entries[boundary + 1].rank).toBe(boundary + 2);

    tied.rank = boundary + 1;
    expect(publicStandingsSchema.safeParse(data).success).toBe(false);
    tied.rank = boundary;
    if (boundary === 5) {
      delete tied.gamesPlayed;
      delete tied.winRate;
      expect(publicStandingsSchema.safeParse(data).success).toBe(false);
    }
  }
});

test("公开边界可包含多人并列，甚至全员同分并列第一", () => {
  const boundaryTie = standingsWithPlayers(44);
  for (const entry of boundaryTie.entries.slice(38, 43)) {
    Object.assign(entry, { rank: 39, points: 6, tier: "白银" });
  }
  boundaryTie.entries = boundaryTie.entries.filter((entry) => entry.rank <= 40);
  expect(publicStandingsSchema.parse(boundaryTie).entries).toHaveLength(43);

  const allTied = standingsWithPlayers(65);
  for (const entry of allTied.entries) {
    Object.assign(entry, {
      rank: 1,
      points: 0,
      tier: "王者",
      gamesPlayed: 1,
      winRate: 0,
    });
  }
  expect(publicStandingsSchema.parse(allTied).entries).toHaveLength(65);
});

test("允许零分与负分并列，拒绝不跳号、非降序和拆分同分组", () => {
  const data = standingsWithPlayers(5);
  for (const [index, points, rank] of [
    [0, 0, 1],
    [1, 0, 1],
    [2, -2, 3],
    [3, -2, 3],
    [4, -3, 5],
  ]) {
    Object.assign(data.entries[index], {
      points,
      rank,
      tier: rank === 1 ? "王者" : "星耀",
    });
  }
  expect(publicStandingsSchema.safeParse(data).success).toBe(true);
  const dense = structuredClone(data);
  dense.entries[2].rank = 2;
  expect(publicStandingsSchema.safeParse(dense).success).toBe(false);
  const unsorted = structuredClone(data);
  unsorted.entries[4].points = 1;
  expect(publicStandingsSchema.safeParse(unsorted).success).toBe(false);
  const split = structuredClone(data);
  split.entries[4].points = 0;
  expect(publicStandingsSchema.safeParse(split).success).toBe(false);
});

test("校验拒绝每条段位边界错配、缺号及低段位统计字段", () => {
  for (const rank of [1, 2, 5, 6, 10, 11, 20, 21, 30, 31, 40]) {
    const data = standingsWithPlayers(40);
    data.entries[rank - 1].tier = rank === 1 ? "星耀" : "王者";
    expect(publicStandingsSchema.safeParse(data).success).toBe(false);
  }
  const missingRank = standingsWithPlayers(40);
  missingRank.entries.splice(30, 1);
  expect(publicStandingsSchema.safeParse(missingRank).success).toBe(false);
  const extraStats = standingsWithPlayers(40);
  Object.assign(extraStats.entries[39], { gamesPlayed: 1, winRate: 1 });
  expect(publicStandingsSchema.safeParse(extraStats).success).toBe(false);
});
