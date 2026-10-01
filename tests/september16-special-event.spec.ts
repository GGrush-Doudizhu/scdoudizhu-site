import { expect, test } from "@playwright/test";
import reports from "../src/data/match-reports.json" with { type: "json" };

test("9月16日计入第十五比赛日，点播赛完全排除常规赛", () => {
  const historicalDays = reports.matchDays.filter(
    (day) => day.date <= "2026-09-16",
  );
  expect(historicalDays).toHaveLength(15);
  expect(
    historicalDays.reduce((sum, day) => sum + day.summary.matchCount, 0),
  ).toBe(112);
  const historicalTotals = new Map<string, number>();
  for (const day of historicalDays) {
    for (const player of day.pointChanges) {
      historicalTotals.set(
        player.displayName,
        (historicalTotals.get(player.displayName) ?? 0) + player.total,
      );
    }
  }
  expect(historicalTotals.get("lansoov")).toBe(538);
  expect(historicalTotals.get("GGrush")).toBe(521);
  expect(historicalTotals.get("do''do")).toBe(408);
  expect(
    [...historicalTotals.keys()].some((name) => name.startsWith("J-Y-T-")),
  ).toBe(false);
  const event = reports.specialEvents[0];
  expect(event.commissionedBy).toBe("WoShiLaoCaiNiao");
  expect(event.summary).toEqual({
    matchCount: 7,
    participantCount: 11,
    landlordWins: 1,
    farmerWins: 6,
  });
  expect(event).not.toHaveProperty("pointChanges");
  expect(event).not.toHaveProperty("matchdayNumber");
  expect(
    event.games.map((game) => [game.number, game.date, game.time]),
  ).toEqual([
    [1, "2026-09-18", "20:59"],
    [2, "2026-09-18", "21:17"],
    [3, "2026-09-19", "19:39"],
    [4, "2026-09-19", "19:52"],
    [5, "2026-09-19", "20:02"],
    [6, "2026-09-19", "20:23"],
    [7, "2026-09-19", "20:31"],
  ]);
});

test("9月16日赛报展示六盘与正确的工作人员积分", async ({ page }) => {
  await page.goto("/announcements/2026-09-16/");
  await expect(page.locator(".report-summary-grid strong")).toHaveText([
    "6",
    "14",
    "2",
    "4",
  ]);
  await expect(page.locator(".report-game-card")).toHaveCount(6);
  for (const [name, points, total, work] of [
    ["lansoov", "+46", "+56", "主播 +10"],
    ["ctrl+Q++Q", "+34", "+49", "房主、主播（兼职封顶） +15"],
    ["do''do", "+11", "+21", "主播 +10"],
    ["GGrush", "0", "+5", "赛事数据统计员 +5"],
  ]) {
    const row = page
      .locator(".report-points-table tbody tr")
      .filter({ has: page.getByRole("rowheader", { name, exact: true }) });
    await expect(row.locator("th,td")).toHaveText([name, points, total, work]);
  }
});

test("老板点播赛从新闻可达，展示七盘且没有常规赛积分表", async ({ page }) => {
  await page.goto("/announcements/");
  const card = page.locator(".news-card--special-event");
  await expect(card).toContainText("WoShiLaoCaiNiao 老板点播赛");
  await expect(card).toContainText("不计入 DSL 常规赛");
  await expect(
    page.locator('.news-timeline a[href="#news-special-2026-09-19"]'),
  ).toHaveAttribute("href", "#news-special-2026-09-19");
  await card.getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "WoShiLaoCaiNiao 老板点播赛",
  );
  expect(
    await page
      .getByRole("heading", { level: 1 })
      .evaluate((heading) => heading.scrollWidth - heading.clientWidth),
  ).toBeLessThanOrEqual(1);
  await expect(page.locator(".report-summary-grid strong")).toHaveText([
    "7",
    "11",
    "1",
    "6",
  ]);
  await expect(page.locator(".report-game-card")).toHaveCount(7);
  await expect(
    page.locator(".report-points-table, .report-staff-grid"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("complementary", { name: "点播赛说明" }),
  ).toContainText("不计积分、参赛场次、胜率及掉线统计");
  await expect(
    page
      .locator(".report-game-card")
      .nth(1)
      .getByRole("region", { name: "地主胜", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "活动日期与暂停说明" }),
  ).toContainText("因游戏服务器故障暂停");
  await expect(page.locator(".report-game-card header strong")).toHaveText([
    "2026-09-18 · 20:59",
    "2026-09-18 · 21:17",
    "2026-09-19 · 19:39",
    "2026-09-19 · 19:52",
    "2026-09-19 · 20:02",
    "2026-09-19 · 20:23",
    "2026-09-19 · 20:31",
  ]);
  await expect(page.locator("main")).not.toContainText("农民方连胜前六盘");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
});
