import { expect, test } from "@playwright/test";

test("第十四比赛日显示八盘、21人、四次首次掉线与正常工作积分", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  expect((await page.goto("/announcements/2026-09-14/"))?.status()).toBe(200);
  await expect(page.locator(".report-game-card")).toHaveCount(8);
  await expect(page.locator(".report-summary-grid strong")).toHaveText([
    "8",
    "21",
    "5",
    "3",
  ]);
  await expect(page.locator(".report-points-table tbody tr")).toHaveCount(22);
  await expect(page.locator(".page-hero")).toContainText("KK赛区");
  await expect(
    page.getByRole("complementary", { name: "临时加赛特别计分说明" }),
  ).toHaveCount(0);
  await expect(page.locator(".report-points-section")).toContainText(
    "地主胜 / 负为 +12 / +3",
  );
  for (const [name, match, total, work] of [
    ["do''do", "+57", "+72", "房主、主播（兼职封顶） +15"],
    ["GGrush", "0", "+5", "赛事数据统计员 +5"],
    ["KaKaRu", "+28", "+28", "—"],
    ["五社", "+69", "+69", "—"],
    ["白胖", "+8", "+8", "—"],
    ["剑圣", "+10", "+10", "—"],
    ["老全", "0", "0", "—"],
    ["Quake", "0", "0", "—"],
    ["GAT-X102", "+2", "+2", "—"],
  ]) {
    const row = page
      .locator(".report-points-table tbody tr")
      .filter({ has: page.getByRole("rowheader", { name, exact: true }) });
    await expect(row.locator("th,td")).toHaveText([name, match, total, work]);
  }
  const disconnects = page.getByRole("complementary", { name: "当日掉线核算" });
  await expect(disconnects.locator("li")).toHaveCount(4);
  for (const name of ["白胖", "剑圣", "老全", "Quake"]) {
    await expect(
      disconnects.locator("li").filter({ hasText: name }),
    ).toContainText("KK赛区当周首次掉线，豁免扣分，该盘 0 分");
  }
  await expect(page.locator(".report-game-card").last()).toContainText(
    "1:18:22",
  );
  await expect(
    page.locator(".report-game-card").getByText("KaKaRu", { exact: true }),
  ).toHaveCount(5);
  await expect(page.getByText("逗地主疯狂星期一", { exact: true })).toHaveCount(
    0,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
