import { createHash } from "node:crypto";

import { expect, test } from "@playwright/test";

import { dsl1Sponsors } from "../src/data/dsl1-sponsors";

const pages = [
  { path: "/", heading: "星际斗地主联赛" },
  { path: "/standings/", heading: "常规赛积分榜" },
  { path: "/schedule/", heading: "第二届联赛赛程" },
  { path: "/rules/", heading: "第二届比赛规则" },
  { path: "/playoffs/", heading: "第二届季后赛" },
  { path: "/announcements/", heading: "赛事新闻" },
  { path: "/rewards/", heading: "奖励与赞助" },
  { path: "/maps/", heading: "地图与下载" },
];

const forbiddenPublicCopy = [
  "筹备中",
  "未开始",
  "待公布",
  "待确认",
  "不会替主办方",
  "虚构成绩",
  "赞助致谢需要重新确认",
  "本页只提供 DSL2 文件",
  "数据公开说明",
  "下载后在星际争霸中载入地图",
  "每周四晚",
];

const mapDownloads = [
  {
    path: "/downloads/maps/doudizhu-3v5-5.6.scx",
    sha256: "C1BD89DFC739E71902381756244BB34F0DABE5F0BAF8CCA1A3B014B08601A887",
  },
  {
    path: "/downloads/maps/doudizhu-2v6-remake-c1.1.scx",
    sha256: "617BECFFFD9A72911388F0E1C89D6B33C4015A324ED3187423F5CC3BA8E4BD7A",
  },
];

for (const currentPage of pages) {
  test(`${currentPage.path} 提供面向参赛者的完整静态页面`, async ({ page }) => {
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

    const publicText = await page.locator("body").innerText();
    for (const forbidden of forbiddenPublicCopy) {
      expect(publicText).not.toContain(forbidden);
    }

    const overflow = await page.evaluate(() => ({
      body: document.body.scrollWidth - document.body.clientWidth,
      root:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    }));
    expect(overflow.body).toBeLessThanOrEqual(1);
    expect(overflow.root).toBeLessThanOrEqual(1);

    const tooSmallText = await page.locator("body").evaluate((body) =>
      Array.from(body.querySelectorAll<HTMLElement>("*"))
        .filter((element) =>
          Array.from(element.childNodes).some(
            (node) =>
              node.nodeType === Node.TEXT_NODE &&
              Boolean(node.textContent?.trim()),
          ),
        )
        .filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            Number.parseFloat(style.opacity) > 0 &&
            rect.width > 0 &&
            rect.height > 0
          );
        })
        .map((element) => ({
          selector: `${element.tagName.toLowerCase()}.${element.className}`,
          text: element.textContent?.trim().slice(0, 40),
          size: Number.parseFloat(getComputedStyle(element).fontSize),
        }))
        .filter((item) => item.size < 14),
    );
    expect(tooSmallText).toEqual([]);

    const publicUrls = await page
      .locator("a[href], img[src], link[href], script[src]")
      .evaluateAll((elements) =>
        elements
          .map(
            (element) =>
              element.getAttribute("href") ?? element.getAttribute("src") ?? "",
          )
          .filter((value) => value && !value.startsWith("data:")),
      );
    for (const publicUrl of publicUrls) {
      expect(publicUrl).not.toMatch(/[\u3400-\u9fff]/u);
      expect(publicUrl).not.toMatch(/%[0-9a-f]{2}/iu);
    }
    expect(consoleErrors).toEqual([]);
  });
}

test("页头使用包含三个种族花色的新图标与中文导航", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".brand-mark")).toHaveAttribute(
    "src",
    "/assets/dsl-three-races-suits.png",
  );
  const primaryNavigation = page.getByRole("navigation", { name: "主导航" });
  await expect(
    primaryNavigation.getByRole("link", { name: "常规赛积分榜" }),
  ).toBeVisible();
  await expect(
    primaryNavigation.getByRole("link", { name: "新闻", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".season-status")).toHaveCount(0);
  await expect(page.locator(".hero-signal")).toHaveCount(0);
});

test("首页按四档赞助荣誉完整致谢第一届赞助伙伴", async ({ page, request }) => {
  await page.goto("/");
  const tribute = page.locator(".home-sponsor-tribute");
  await expect(
    tribute.getByRole("heading", { name: "感谢一路支持 DSL 的老板" }),
  ).toBeVisible();
  await expect(tribute.getByText("第一届 DSL 赞助鸣谢")).toBeVisible();
  await expect(
    tribute.getByText(
      "第一届联赛离不开各位老板们的支持。谨在此向每一份支持致以最真挚的感谢。",
    ),
  ).toBeVisible();
  await expect(tribute.getByRole("link")).toHaveCount(0);
  await expect(tribute.locator(".home-sponsor-card")).toHaveCount(24);

  const displayedNames = await tribute
    .locator(".home-sponsor-card strong")
    .allTextContents();
  expect(displayedNames).toEqual(dsl1Sponsors.map((sponsor) => sponsor.name));
  expect(displayedNames.slice(0, 3)).toEqual(["DBS", "TianW", "zhendeniu"]);
  expect(new Set(displayedNames).size).toBe(24);

  const expectedTierCounts = {
    platinum: 1,
    diamond: 2,
    gold: 7,
    silver: 14,
  } as const;
  for (const [tier, count] of Object.entries(expectedTierCounts)) {
    await expect(tribute.locator(`[data-sponsor-tier="${tier}"]`)).toHaveCount(
      count,
    );
  }
  await expect(
    tribute.getByRole("heading", { name: "铂金赞助商" }),
  ).toBeVisible();
  await expect(
    tribute.getByRole("heading", { name: "钻石赞助商" }),
  ).toBeVisible();
  await expect(
    tribute.getByRole("heading", { name: "黄金赞助商" }),
  ).toBeVisible();
  await expect(
    tribute.getByRole("heading", { name: "白银赞助商" }),
  ).toBeVisible();

  const tributeText = await tribute.innerText();
  expect(tributeText).not.toContain("金额");
  expect(tributeText).not.toContain("赞助明细");
  expect(tributeText).not.toMatch(/\d+(?:\.\d+)?\s*元/u);

  for (const sponsor of dsl1Sponsors) {
    const avatar = await request.get(sponsor.avatar);
    expect(avatar.status()).toBe(200);
    expect(avatar.headers()["content-type"]).toBe("image/jpeg");
  }
});

test("积分榜展示 DSL1 换算预览、前三名与完整前二十五名", async ({ page }) => {
  await page.goto("/standings/");
  await expect(page.getByText("榜单效果预览")).toBeVisible();
  await expect(page.locator(".podium-card")).toHaveCount(3);
  await expect(page.locator(".standings-table tbody tr")).toHaveCount(25);
  await expect(page.locator(".standings-table tbody tr").first()).toContainText(
    "lansoov",
  );
  await expect(page.locator(".standings-table tbody tr").first()).toContainText(
    "1,375",
  );
  await expect(page.getByText("胜率")).toHaveCount(0);
  await expect(page.locator(".podium-card--2 .podium-suit")).toHaveText("♥");
  await expect(page.locator(".podium-card--3 .podium-suit")).toHaveText("♣");
  await expect(page.locator(".page-hero .eyebrow")).toHaveCount(0);

  const tierColors = await page
    .locator(".tier-emblem")
    .evaluateAll((items) =>
      items.map((item) => getComputedStyle(item).borderLeftColor),
    );
  expect(new Set(tierColors).size).toBe(7);

  const tierShapes = await page
    .locator(".tier-emblem .tier-crest-icon")
    .evaluateAll((items) =>
      items.map((item) => getComputedStyle(item).clipPath),
    );
  expect(new Set(tierShapes).size).toBe(7);
});

test("奖励页合并韩服并列奖金并显示最新赞助答谢说明", async ({ page }) => {
  await page.goto("/rewards/");
  await expect(
    page.getByRole("heading", { name: "感谢以下赞助支持的老板" }),
  ).toBeVisible();
  await expect(
    page.getByText("（老板答谢名单会随着众筹的进行更新上来）"),
  ).toBeVisible();

  const koreanReward = page.locator(".reward-card").nth(2);
  await expect(koreanReward.locator(".reward-split li")).toHaveCount(4);
  await expect(koreanReward.locator(".reward-split li").last()).toContainText(
    "第四、第五名各 50 元",
  );

  await page.goto("/playoffs/");
  await expect(
    page.locator('.prize-list[aria-label="韩服 8R 奖金"] li'),
  ).toHaveCount(4);
  await expect(page.getByText("第四、第五名各 50元")).toBeVisible();
});

test("规则总览使用单一表格且地图页标明 8R 地图缺位", async ({ page }) => {
  await page.goto("/rules/");
  await expect(page.locator(".rules-overview tbody tr")).toHaveCount(8);
  await expect(page.locator("main .content-grid")).toHaveCount(0);
  await expect(page.getByText("游戏角色积分规则")).toBeVisible();
  await expect(page.getByText("成为赛事志愿者加分更多")).toBeVisible();

  await page.goto("/maps/");
  await expect(page.getByText("2v6经典老图重制")).toBeVisible();
  await expect(page.getByText("地图缺，之后会补上")).toBeVisible();
  await expect(page.locator(".map-card")).toHaveCount(3);
});

test("赛程明确开赛日期且不显示状态图例", async ({ page }) => {
  await page.goto("/schedule/");
  await expect(page.getByText("2026年8月24日", { exact: true })).toBeVisible();
  await expect(page.getByText("第一周至第六周")).toBeVisible();
  await expect(page.locator(".legend")).toHaveCount(0);
});

test("新闻中的赛事方案可直接阅读且奖金已经同步", async ({ request, page }) => {
  const response = await request.get("/news/dsl2-league-plan.html");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("常规赛不设置现金奖金");
  expect(html).toContain("1200 元");
  expect(html).toContain("第四、第五名各 50 元");
  expect(html).toMatch(/网站维护与赛事组织<\/td>\s*<td>500 元<\/td>/);
  expect(html).toMatch(/合计<\/td>\s*<td>2800 元<\/td>/);
  expect(html).toContain("以上奖金及经费均为众筹目标，应以实际众筹情况为准");
  expect(html).not.toContain("<span>第五名 50 元</span>");
  expect(html).not.toContain("暂未建设完毕");

  await page.goto("/news/dsl2-league-plan.html");
  const schemeTextSizes = await page.locator("body").evaluate((body) =>
    Array.from(body.querySelectorAll<HTMLElement>("*"))
      .filter((element) =>
        Array.from(element.childNodes).some(
          (node) =>
            node.nodeType === Node.TEXT_NODE &&
            Boolean(node.textContent?.trim()),
        ),
      )
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      })
      .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
  );
  expect(Math.min(...schemeTextSizes)).toBeGreaterThanOrEqual(14);
});

test("核心内容在禁用 JavaScript 时仍可阅读", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto("http://127.0.0.1:4321/rules/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "第二届比赛规则",
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

test("首页积分榜入口使用仓库内逐字节一致的指定壁纸副本", async ({
  request,
}) => {
  const response = await request.get("/assets/protoss-wallpaper-4.png");
  expect(response.status()).toBe(200);
  const body = await response.body();
  expect(createHash("sha256").update(body).digest("hex").toUpperCase()).toBe(
    "4CE3E0AC6CA59EC095ED60ACD27DDB2B0D90CBFE64EB564A1E5DA4972C4B8A63",
  );
});

test("未知路径返回自定义 404 页面", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist/");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "信号离开了航线",
  );
});
