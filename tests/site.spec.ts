import { createHash } from "node:crypto";

import { expect, test } from "@playwright/test";

import { dsl1Sponsors } from "../src/data/dsl1-sponsors";
import { dsl2Sponsors } from "../src/data/dsl2-sponsors";

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
    path: "/downloads/maps/斗地主Doudizhu 5.7.scx",
    fileName: "斗地主Doudizhu 5.7.scx",
    sha256: "0BB93935F4DEA26837BC332F60530C9B7F60C31A622B7FF6DAE489B1318CD2DC",
  },
  {
    path: "/downloads/maps/斗地主重制版c1.2.scx",
    fileName: "斗地主重制版c1.2.scx",
    sha256: "E841B0892A8DDB81F5D717DD1B138F2458DC3A7337F31AA8C83F86E826FF1421",
  },
];

const retiredMapPaths = [
  "/downloads/maps/doudizhu-3v5-5.6.scx",
  "/downloads/maps/doudizhu-2v6-remake-c1.1.scx",
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
      if (!publicUrl.endsWith(".scx")) {
        expect(publicUrl).not.toMatch(/[\u3400-\u9fff]/u);
        expect(publicUrl).not.toMatch(/%[0-9a-f]{2}/iu);
      }
    }
    expect(consoleErrors).toEqual([]);
  });
}

test("页头、标签页与分享信息统一使用正式赛事徽章", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.locator(".brand-mark")).toHaveAttribute(
    "src",
    "/assets/dsl-official-logo.webp",
  );
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute(
    "href",
    "/assets/dsl-official-logo-64.png",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://scdoudizhu.com/assets/dsl-official-logo-512.webp",
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    "https://scdoudizhu.com/assets/dsl-official-logo-512.webp",
  );

  const logoAssets = [
    {
      path: "/assets/dsl-official-logo.webp",
      type: "image/webp",
      maximumSize: 20_000,
    },
    {
      path: "/assets/dsl-official-logo-512.webp",
      type: "image/webp",
      maximumSize: 80_000,
    },
    {
      path: "/assets/dsl-official-logo-64.png",
      type: "image/png",
      maximumSize: 10_000,
    },
  ];
  for (const asset of logoAssets) {
    const response = await request.get(asset.path);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe(asset.type);
    expect((await response.body()).byteLength).toBeLessThan(asset.maximumSize);
  }

  for (const retiredLogo of [
    "/assets/dsl-three-races-suits.webp",
    "/assets/dsl-three-races-suits-512.webp",
  ]) {
    expect((await request.get(retiredLogo)).status()).toBe(200);
  }

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
  const tribute = page.locator(
    'section.home-sponsor-tribute[aria-labelledby="dsl1-sponsors"]',
  );
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
  expect(tributeText).not.toContain("其余赞助老板");
  expect(tributeText).not.toMatch(/第\s*\d/u);
  expect(tributeText).not.toMatch(/\d+(?:\.\d+)?\s*元/u);

  for (const sponsor of dsl1Sponsors) {
    const avatar = await request.get(sponsor.avatar);
    expect(avatar.status()).toBe(200);
    expect(avatar.headers()["content-type"]).toBe("image/webp");
    expect((await avatar.body()).byteLength).toBeLessThan(20_000);
  }
});

test("首页鸣谢第二届首批赞助老板并继续邀请众筹", async ({ page, request }) => {
  await page.goto("/");
  const tribute = page.locator(
    'section.home-sponsor-tribute[aria-labelledby="dsl2-sponsors"]',
  );

  await expect(
    tribute.getByRole("heading", { name: "感谢支持第二届联赛的老板" }),
  ).toBeVisible();
  await expect(tribute.getByText("第二届 DSL 赞助鸣谢")).toBeVisible();
  await expect(
    tribute.getByText("当前支持尚未达到赛事目标", { exact: false }),
  ).toBeVisible();
  await expect(
    tribute.getByText("感谢四位老板率先支持", { exact: false }),
  ).toBeVisible();
  await expect(tribute.locator('[data-sponsor-tier="platinum"]')).toContainText(
    "DBS",
  );
  await expect(tribute.locator('[data-sponsor-tier="diamond"]')).toContainText(
    "WoShiLaoCaiNiao",
  );
  await expect(tribute.locator('[data-sponsor-tier="gold"]')).toContainText(
    "Fly",
  );
  await expect(tribute.locator('[data-sponsor-tier="silver"]')).toContainText(
    "KaKaRu",
  );
  await expect(tribute.locator(".home-sponsor-card")).toHaveCount(4);

  const displayedNames = await tribute
    .locator(".home-sponsor-card strong")
    .allTextContents();
  expect(displayedNames).toEqual(["DBS", "WoShiLaoCaiNiao", "Fly", "KaKaRu"]);

  for (const tier of ["diamond", "gold", "silver"]) {
    const sponsorGrid = tribute
      .locator(`.home-sponsor-tier--${tier} .home-sponsor-grid`)
      .first();
    const sponsorCard = sponsorGrid.locator(".home-sponsor-card").first();
    const [gridBox, cardBox] = await Promise.all([
      sponsorGrid.boundingBox(),
      sponsorCard.boundingBox(),
    ]);
    expect(gridBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect(
      Math.abs(
        cardBox!.x + cardBox!.width / 2 - (gridBox!.x + gridBox!.width / 2),
      ),
    ).toBeLessThanOrEqual(1);
  }

  const tributeText = await tribute.innerText();
  expect(tributeText).not.toMatch(/\d+(?:\.\d+)?\s*元/u);
  for (const privateDetail of [
    "200",
    "1000",
    "1500",
    "500",
    "18.88",
    "域名续费",
    "老鸟杯",
    "作者辛苦费",
  ]) {
    expect(tributeText).not.toContain(privateDetail);
  }

  for (const sponsor of dsl2Sponsors) {
    const avatar = await request.get(sponsor.avatar);
    expect(avatar.status()).toBe(200);
    expect(avatar.headers()["content-type"]).toBe("image/webp");
    expect((await avatar.body()).byteLength).toBeLessThan(20_000);
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
    page.getByText("铂金赞助商 DBS", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("钻石赞助商 WoShiLaoCaiNiao", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("黄金赞助商 Fly", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("白银赞助商 KaKaRu", { exact: false }),
  ).toBeVisible();

  const publicSponsorText = await page.locator(".sponsor-tribute").innerText();
  for (const privateDetail of [
    "200",
    "1000",
    "1500",
    "500",
    "18.88",
    "域名续费",
    "老鸟杯",
    "作者辛苦费",
  ]) {
    expect(publicSponsorText).not.toContain(privateDetail);
  }

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
  await expect(page.getByText("直播与赛事志愿工作")).toBeVisible();
  await expect(page.getByText("开播参赛", { exact: true })).toBeVisible();
  await expect(page.getByText("当盘开播，无论胜负均额外加分")).toBeVisible();
  await expect(
    page.getByText("掉线者扣除 30 点积分", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("积分允许扣至负数", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("其余 7 名玩家", { exact: false })).toBeVisible();
  await expect(page.getByText("第 2 次掉线后", { exact: false })).toBeVisible();

  await page.goto("/maps/");
  await expect(page.getByText("2v6经典老图重制")).toBeVisible();
  await expect(page.getByText("斗地主重制版 c1.2")).toBeVisible();
  await expect(page.getByText("斗地主 3v5 5.7")).toBeVisible();
  await expect(page.getByText("地图缺，之后会补上")).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "地图文件放置位置" }),
  ).toContainText("C盘\\文档\\StarCraft\\Maps\\Download");
  await expect(page.locator(".map-card")).toHaveCount(3);
  for (const map of mapDownloads) {
    await expect(page.locator(`a[download="${map.fileName}"]`)).toHaveAttribute(
      "href",
      map.path,
    );
  }
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
  expect(html).toContain("开播参赛");
  expect(html).toContain("+2 分 / 盘");
  expect(html).toContain("掉线者扣除 30 点积分且允许扣至负数");
  expect(html).toContain("同一周内第 2 次掉线后");
  expect(html).not.toContain("第 3 次掉线后");
  expect(html).not.toContain("<b>主播</b><b>+30 分</b>");
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

for (const retiredMapPath of retiredMapPaths) {
  test(`${retiredMapPath} 旧版地图已经下线`, async ({ request }) => {
    const response = await request.get(retiredMapPath);
    expect(response.status()).toBe(404);
  });
}

test("背景图提供小体积 AVIF 与 WebP 浏览器格式", async ({ request }) => {
  for (const format of ["avif", "webp"] as const) {
    const response = await request.get(`/assets/protoss-wallpaper-4.${format}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe(`image/${format}`);
    expect((await response.body()).byteLength).toBeLessThan(150_000);
  }
});

test("未知路径返回自定义 404 页面", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist/");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "信号离开了航线",
  );
});
