import { expect, test } from "@playwright/test";
import reports from "../src/data/match-reports.json" with { type: "json" };
import standings from "../src/data/public-standings.json" with { type: "json" };

// Independently reconciled against the six administrator JSON files.
const days = [
  ["2026-09-19", 16, 3, 11, 3, 0, 138, 20],
  ["2026-09-21", 17, 5, 13, 2, 3, 239, 30],
  ["2026-09-23", 18, 11, 19, 5, 6, 524, 0],
  ["2026-09-25", 19, 9, 20, 3, 6, 432, 0],
  ["2026-09-26", 20, 10, 22, 3, 7, 481, 0],
  ["2026-09-28", 21, 12, 25, 5, 7, 571, 0],
] as const;

test("新增六个常规赛比赛日共五十盘，点播赛仍独立保留", () => {
  expect(reports.matchDays).toHaveLength(21);
  expect(
    reports.matchDays.reduce((sum, day) => sum + day.summary.matchCount, 0),
  ).toBe(162);
  expect(standings.standingsAsOf).toBe("2026-09-28T23:06:00+08:00");
  expect(
    standings.entries
      .slice(0, 5)
      .map((p) => [p.displayName, p.points, p.gamesPlayed, p.winRate]),
  ).toEqual([
    ["lansoov", 777, 102, 0.568627],
    ["do''do", 588, 93, 0.376344],
    ["GGrush", 521, 55, 0.672727],
    ["年轻", 474, 87, 0.482759],
    ["fly", 432, 63, 0.52381],
  ]);
  expect(reports.specialEvents).toHaveLength(1);
  expect(reports.specialEvents[0].summary.matchCount).toBe(7);
  for (const [
    date,
    number,
    games,
    participants,
    landlordWins,
    farmerWins,
    matchPoints,
    workPoints,
  ] of days) {
    const day = reports.matchDays.find((day) => day.date === date)!;
    expect(day.matchdayNumber).toBe(number);
    expect(day.summary).toEqual({
      matchCount: games,
      participantCount: participants,
      landlordWins,
      farmerWins,
    });
    expect(day.pointChanges.reduce((sum, p) => sum + p.matchPoints, 0)).toBe(
      matchPoints,
    );
    expect(day.pointChanges.reduce((sum, p) => sum + p.workPoints, 0)).toBe(
      workPoints,
    );
    if (date >= "2026-09-23") {
      expect(day.staff).toBeNull();
      expect(
        day.pointChanges.every(
          (p) =>
            p.workPoints === 0 &&
            p.total === p.matchPoints &&
            p.contributions.length === 0,
        ),
      ).toBe(true);
    } else {
      expect(day.staff?.statistician).toBeNull();
    }
  }
});

for (const [date, , games, participants, landlordWins, farmerWins] of days) {
  test(`${date} 赛报保留全部对局并按实际记录展示工作人员`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    expect((await page.goto(`/announcements/${date}/`))?.status()).toBe(200);
    await expect(page.locator(".report-summary-grid strong")).toHaveText(
      [games, participants, landlordWins, farmerWins].map(String),
    );
    await expect(page.locator(".report-game-card")).toHaveCount(games);
    if (date >= "2026-09-23") {
      await expect(page.locator(".report-staff-grid")).toHaveCount(0);
      await expect(page.locator(".report-points-table thead th")).toHaveText([
        "选手",
        "对局积分",
        "每日变动",
      ]);
      await expect(page.locator("main")).not.toContainText("赛事工作积分");
      await expect(page.locator("main")).not.toContainText("工作人员");
    } else {
      await expect(page.locator(".report-staff-grid article")).toHaveCount(2);
      await expect(page.locator(".report-staff-grid")).not.toContainText(
        "赛事数据统计员",
      );
      const staffAwards =
        date === "2026-09-19"
          ? [
              ["ctrl+Q++Q", "房主 +10"],
              ["DR.Yang", "主播 +10"],
            ]
          : [
              ["叉子别", "房主 +10"],
              ["DR.Yang", "主播 +10"],
              ["年轻", "主播 +10"],
            ];
      for (const [name, award] of staffAwards) {
        const row = page
          .locator(".report-points-table tbody tr")
          .filter({ has: page.getByRole("rowheader", { name, exact: true }) });
        await expect(row.locator("td").last()).toHaveText(award);
      }
    }
    if (date === "2026-09-21") {
      const first = page.locator(".report-game-card").first();
      await expect(first.locator("header strong")).toHaveText("20:22");
      await expect(
        first.getByRole("region", { name: "地主胜", exact: true }),
      ).toBeVisible();
      await expect(
        first.getByRole("region", { name: "富农负", exact: true }),
      ).toBeVisible();
      await expect(
        first.getByRole("region", { name: "贫农负", exact: true }),
      ).toBeVisible();
    }
    if (date === "2026-09-28") {
      await expect(
        page.locator("#daily-disconnect-title").locator(".."),
      ).toContainText("笑笑：KK赛区当周首次掉线，豁免扣分，该盘 0 分。");
      const row = page.locator(".report-points-table tbody tr").filter({
        has: page.getByRole("rowheader", { name: "笑笑", exact: true }),
      });

      await expect(row.locator("th,td")).toHaveText(["笑笑", "0", "0"]);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test("更新姓名归并后累计成绩合并，第40名并列完整公开", () => {
  for (const [name, rank, points] of [
    ["IKILllIII", 6, 362],
    ["lucky2023", 12, 251],
    ["ctrl+Q++Q", 14, 195],
    ["叉子别", 25, 77],
    ["jy02626922", 31, 55],
    ["剑圣", 32, 54],
    ["G600", 33, 51],
  ] as const) {
    const player = standings.entries.find((p) => p.displayName === name);
    expect(player).toMatchObject({ rank, points });
  }
  expect(standings.entries).toHaveLength(41);
  expect(
    standings.entries
      .filter((p) => p.rank === 40)
      .map((p) => [p.displayName, p.points, p.tier]),
  ).toEqual([
    ["星际争霸新生", 26, "白银"],
    ["Super_555", 26, "白银"],
  ]);
  expect(
    standings.entries.some((p) =>
      ["QQ", "G.600", "luckyy2023", "嘴哥逗地主", "抖地主jy02626922"].includes(
        p.displayName,
      ),
    ),
  ).toBe(false);
  const september19 = reports.matchDays.find(
    (day) => day.date === "2026-09-19",
  )!;
  expect(september19.staff?.hosts).toEqual(["ctrl+Q++Q"]);
  expect(
    september19.pointChanges.find((p) => p.displayName === "ctrl+Q++Q"),
  ).toMatchObject({ matchPoints: 0, workPoints: 10, total: 10 });
});
