import { createHash } from "node:crypto";

import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", heading: "积分决定席位" },
  { path: "/standings/", heading: "每一分都有出处" },
  { path: "/schedule/", heading: "十周，四十个比赛日" },
  { path: "/rules/", heading: "参加、贡献、累计" },
  { path: "/playoffs/", heading: "两条赛道，同步决战" },
  { path: "/announcements/", heading: "所有变化，都有明确记录" },
  { path: "/rewards/", heading: "目标金额，不等于实收金额" },
  { path: "/maps/", heading: "DSL2 当前比赛地图" },
];

const mapDownloads = [
  {
    path: encodeURI("/downloads/maps/斗地主Doudizhu 5.6.scx"),
    sha256: "C1BD89DFC739E71902381756244BB34F0DABE5F0BAF8CCA1A3B014B08601A887",
  },
  {
    path: encodeURI("/downloads/maps/斗地主重制版c1.1.scx"),
    sha256: "617BECFFFD9A72911388F0E1C89D6B33C4015A324ED3187423F5CC3BA8E4BD7A",
  },
];

for (const currentPage of pages) {
  test(`${currentPage.path} 提供完整静态页面结构`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    const response = await page.goto(currentPage.path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.locator("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      currentPage.heading,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new RegExp(`${currentPage.path.replaceAll("/", "\\/")}$`),
    );

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.body.clientWidth,
      root:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    }));
    expect(overflow.body).toBeLessThanOrEqual(1);
    expect(overflow.root).toBeLessThanOrEqual(1);
    expect(consoleErrors).toEqual([]);
  });
}

test("积分榜保持真实空状态且没有虚构选手", async ({ page }) => {
  await page.goto("/standings/");
  await expect(page.getByText("正式积分尚未发布")).toBeVisible();
  await expect(page.locator(".standings-table tbody tr")).toHaveCount(0);
});

test("核心内容在禁用 JavaScript 时仍可阅读", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("http://127.0.0.1:4321/rules/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "参加、贡献、累计",
  );
  await expect(page.getByText("地主", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("主机", { exact: true }).first()).toBeVisible();

  await context.close();
});

test("robots 与 sitemap 可被搜索引擎读取", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(
    "Sitemap: https://scdoudizhu.com/sitemap-index.xml",
  );

  const sitemap = await request.get("/sitemap-index.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain(
    "https://scdoudizhu.com/sitemap-0.xml",
  );
});

for (const map of mapDownloads) {
  test(`${map.path} 提供完整地图文件`, async ({ request }) => {
    const response = await request.get(map.path);
    expect(response.status()).toBe(200);
    const body = await response.body();
    expect(createHash("sha256").update(body).digest("hex").toUpperCase()).toBe(
      map.sha256,
    );
  });
}

test("未知路径返回自定义 404 页面", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist/");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "信号离开了航线",
  );
});
