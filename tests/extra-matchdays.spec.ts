import { expect, test } from "@playwright/test";

test("102 历史赛果统一归并为 GAT-X102 并保留临时加赛负分", async ({ page }) => {
  for (const [date, points, appearances] of [
    ["2026-08-31", "+10", 2],
    ["2026-09-11", "+27", 4],
    ["2026-09-12", "+12", 3],
    ["2026-09-13", "-8", 2],
  ] as const) {
    await page.goto(`/announcements/${date}/`);
    const row = page.locator(".report-points-table tbody tr").filter({
      has: page.getByRole("rowheader", { name: "GAT-X102", exact: true }),
    });
    await expect(row.locator("th,td")).toHaveText([
      "GAT-X102",
      points,
      points,
      "—",
    ]);
    await expect(
      page.getByRole("rowheader", { name: "102", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.locator(".report-game-card").getByText("GAT-X102", { exact: true }),
    ).toHaveCount(appearances);
    await expect(
      page.locator(".report-game-card").getByText("102", { exact: true }),
    ).toHaveCount(0);
  }
});

for (const [date, count, participants, rows] of [
  ["2026-09-12", 11, 19, 19],
  ["2026-09-13", 7, 16, 17],
] as const) {
  test(`${date} 赛报正确显示当日计分与工作人员`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    expect((await page.goto(`/announcements/${date}/`))?.status()).toBe(200);
    await expect(page.locator(".report-game-card")).toHaveCount(count);
    await expect(
      page.locator(".report-summary-grid article").nth(1),
    ).toContainText(String(participants));
    await expect(page.locator(".report-points-table tbody tr")).toHaveCount(
      rows,
    );
    const special = page.getByRole("complementary", {
      name: "临时加赛特别计分说明",
    });
    if (date === "2026-09-13") {
      await expect(special).toBeVisible();
      await expect(special).toContainText("地主胜 / 负为 +12 / -6");
      await expect(special).toContainText("农民胜 / 负为 +8 / -4");
      await expect(page.locator(".report-points-section")).not.toContainText(
        "+12 / +3",
      );
      await expect(page.locator(".report-staff-grid")).toContainText(
        "IKILllIII",
      );
      for (const [name, match, total, work] of [
        ["IKILllIII", "+8", "+23", "房主、主播（兼职封顶） +15"],
        ["GGrush", "0", "+5", "赛事数据统计员 +5"],
        ["mehdiren", "-8", "-8", "—"],
        ["YiDeFuRen", "-6", "-6", "—"],
        ["do''do", "0", "0", "—"],
        ["feifeiht", "+38", "+38", "—"],
      ]) {
        const row = page
          .locator(".report-points-table tbody tr")
          .filter({ has: page.getByRole("rowheader", { name, exact: true }) });
        await expect(row.locator("th,td")).toHaveText([
          name,
          match,
          total,
          work,
        ]);
        if (total.startsWith("-"))
          await expect(row.locator(".report-points-total")).toHaveClass(
            /report-points-total--negative/,
          );
      }
    } else {
      await expect(special).toHaveCount(0);
      await expect(page.locator(".report-points-section")).toContainText(
        "地主胜 / 负为 +12 / +3",
      );
      const row = page.locator(".report-points-table tbody tr").filter({
        has: page.getByRole("rowheader", { name: "GGrush", exact: true }),
      });
      await expect(row.locator("th,td")).toHaveText([
        "GGrush",
        "+75",
        "+90",
        "房主、主播、赛事数据统计员（兼职封顶） +15",
      ]);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}
