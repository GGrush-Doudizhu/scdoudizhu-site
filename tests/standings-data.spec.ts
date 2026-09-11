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

test("公开榜完整覆盖累计前四十名且不含青铜选手", () => {
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
    .slice(0, 40);
  expect(
    publicStandings.entries.map(({ displayName, points }) => [
      displayName,
      points,
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

test("公开榜允许最多四十人并拒绝导出青铜选手", () => {
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
