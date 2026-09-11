import { createHash } from "node:crypto";

import { expect, test } from "@playwright/test";

import { dsl1Sponsors } from "../src/data/dsl1-sponsors";
import { dsl2Sponsors } from "../src/data/dsl2-sponsors";
import matchReports from "../src/data/match-reports.json" with { type: "json" };

const pages = [
  { path: "/", heading: "星际斗地主联赛" },
  { path: "/standings/", heading: "常规赛积分榜" },
  { path: "/rules/", heading: "第二届赛程与规则" },
  { path: "/playoffs/", heading: "第二届季后赛" },
  { path: "/announcements/", heading: "赛事新闻" },
  { path: "/rewards/", heading: "赞助鸣谢" },
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
  await expect(primaryNavigation.getByRole("link")).toHaveCount(7);
  await expect(primaryNavigation.getByRole("link").nth(0)).toHaveText("首页");
  await expect(primaryNavigation.getByRole("link").nth(1)).toHaveText(
    "赞助鸣谢",
  );
  await expect(
    primaryNavigation.getByRole("link", { name: "赛程与规则", exact: true }),
  ).toHaveAttribute("href", "/rules/");
  await expect(
    primaryNavigation.getByRole("link", { name: "赞助鸣谢", exact: true }),
  ).toHaveAttribute("href", "/rewards/");
  await expect(
    primaryNavigation.getByRole("link", { name: "地图下载", exact: true }),
  ).toHaveAttribute("href", "/maps/");
  await expect(page.getByRole("navigation", { name: "补充导航" })).toHaveCount(
    0,
  );
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
    tribute.getByText("感谢各位老板率先支持", { exact: false }),
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
  const silverSponsors = tribute.locator('[data-sponsor-tier="silver"]');
  await expect(silverSponsors).toHaveCount(2);
  await expect(silverSponsors.filter({ hasText: /^KaKaRu$/u })).toHaveCount(1);
  await expect(silverSponsors.filter({ hasText: /^nianqing$/u })).toHaveCount(
    1,
  );
  await expect(tribute.locator(".home-sponsor-card")).toHaveCount(5);

  const displayedNames = await tribute
    .locator(".home-sponsor-card strong")
    .allTextContents();
  expect(displayedNames).toEqual([
    "DBS",
    "WoShiLaoCaiNiao",
    "Fly",
    "KaKaRu",
    "nianqing",
  ]);

  for (const tier of ["diamond", "gold"]) {
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

test("积分榜同分同名次，完整展示白银及以上含并列选手", async ({ page }) => {
  await page.goto("/standings/");
  await expect(page.getByText("榜单效果预览")).toHaveCount(0);
  await expect(page.locator(".podium-card")).toHaveCount(3);
  await expect(
    page.locator(".standings-table tbody tr[data-rank]"),
  ).toHaveCount(43);
  await expect(page.locator(".standings-table tbody tr")).toHaveCount(44);
  const bronzeSummary = page.locator(".standings-summary-row");
  await expect(bronzeSummary.locator("td, th")).toHaveText([
    "41+",
    "其他所有青铜选手",
    "不公开展示",
    /^\s*▲\s*青铜\s*$/u,
  ]);
  await expect(page.locator(".standings-table tbody tr").last()).toHaveClass(
    "standings-summary-row",
  );
  await expect(page.locator(".standings-table tbody tr").first()).toContainText(
    "lansoov",
  );
  await expect(page.locator(".standings-table tbody tr").first()).toContainText(
    "408",
  );
  await expect(
    page.getByText("积分榜展示白银及以上选手的名次、积分与段位", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByText("统计截至：2026年9月9日")).toBeVisible();
  await expect(page.locator(".podium-record")).toHaveCount(0);
  await expect(page.locator(".podium")).not.toContainText("总场数");
  await expect(page.locator(".podium")).not.toContainText("胜率");
  await expect(page.locator(".standing-elite-stats")).toHaveCount(5);
  await expect(
    page.locator('.standings-table tbody tr[data-rank="1"]'),
  ).toContainText("总场数 50 · 胜率 54%");
  for (const [rank, name, points, record] of [
    [2, "GGrush", "331", "总场数 36 · 胜率 66.7%"],
    [4, "do''do", "237", "总场数 30 · 胜率 43.3%"],
    [5, "IKILllIII", "233", "总场数 24 · 胜率 75%"],
  ] as const) {
    const row = page.locator(`.standings-table tbody tr[data-rank="${rank}"]`);
    await expect(row).toContainText(name);
    await expect(
      row.getByRole("cell", { name: points, exact: true }),
    ).toBeVisible();
    await expect(row).toContainText(record);
  }
  const mergedPlayer = page.locator('.standings-table tbody tr[data-rank="3"]');
  await expect(mergedPlayer).toContainText("fly");
  await expect(mergedPlayer).toContainText("250");
  await expect(mergedPlayer).toContainText("总场数 37 · 胜率 48.6%");
  await expect(
    page.locator('.standings-table tbody tr[data-rank="4"]'),
  ).toContainText("do''do");
  const mergedStefsunli = page.locator(".standings-table tbody tr").filter({
    has: page.getByRole("rowheader", { name: "stefsunli", exact: true }),
  });
  await expect(mergedStefsunli).toHaveAttribute("data-rank", "19");
  await expect(
    mergedStefsunli.getByRole("cell", { name: "76", exact: true }),
  ).toBeVisible();
  await expect(mergedStefsunli).toContainText("stefsunli");
  for (const [rank, name, points] of [
    [7, "豆豆", "170"],
    [13, "DR.Yang", "120"],
    [16, "shougong", "98"],
    [18, "FFS-Open-1", "77"],
  ] as const) {
    const row = page.locator(`.standings-table tbody tr[data-rank="${rank}"]`);
    await expect(row).toContainText(name);
    await expect(
      row.getByRole("cell", { name: points, exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.locator('.standings-table tbody tr[data-rank="25"]'),
  ).toContainText("白胖");
  for (const [tier, first, last, count] of [
    ["王者", 1, 1, 1],
    ["星耀", 2, 5, 4],
    ["钻石", 6, 10, 5],
    ["铂金", 11, 19, 10],
    ["黄金", 21, 30, 11],
    ["白银", 32, 39, 12],
  ] as const) {
    await expect(
      page.locator(`.standings-table tbody tr[data-tier="${tier}"]`),
    ).toHaveCount(count);
    for (const rank of [first, last]) {
      await expect(
        page.locator(`.standings-table tbody tr[data-rank="${rank}"]`).first(),
      ).toHaveAttribute("data-tier", tier);
    }
  }
  for (const [rank, name, points, tier] of [
    [19, "怕瓦落地", "76", "铂金"],
    [27, "破光师", "20", "黄金"],
    [27, "Quake", "20", "黄金"],
    [29, "叉子别", "15", "黄金"],
    [30, "digua", "14", "黄金"],
    [30, "mehdiren", "14", "黄金"],
    [39, "^sAvior^-Yi-", "8", "白银"],
    [39, "7788", "8", "白银"],
    [39, "阿斯蒂芬", "8", "白银"],
    [39, "消息来源可靠吗", "8", "白银"],
    [39, "lalala.bobo", "8", "白银"],
  ] as const) {
    const row = page
      .locator(".standings-table tbody tr")
      .filter({ has: page.getByRole("rowheader", { name, exact: true }) });
    await expect(row).toHaveAttribute("data-rank", String(rank));
    await expect(row).toHaveAttribute("data-tier", tier);
    await expect(row.getByRole("rowheader")).toHaveText(name);
    await expect(
      row.getByRole("cell", { name: points, exact: true }),
    ).toBeVisible();
  }
  await expect(
    page.locator('.standings-table tbody tr[data-tier="青铜"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('.standings-table tbody tr[data-rank="41"]'),
  ).toHaveCount(0);
  await expect(page.locator(".standings-table")).not.toContainText("路西法");
  await expect(page.locator(".standings-table")).not.toContainText("G600");
  await expect(page.locator(".tier-emblem p")).toHaveText([
    "第 1 名",
    "第 2—5 名",
    "第 6—10 名",
    "第 11—20 名",
    "第 21—30 名",
    "第 31—40 名",
    "第 41 名及以后",
  ]);
  await expect(page.locator(".tier-note")).toContainText("常规赛前 30 名");
  await expect(
    page.locator('.standings-table tbody tr[data-rank="5"]'),
  ).toContainText(/总场数 \d+ · 胜率 \d+(?:\.\d)?%/u);
  await expect(
    page.locator('.standings-table tbody tr[data-rank="6"]'),
  ).not.toContainText("胜率");
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

test("第十比赛日展示五盘赛果、十四人及房主分配和首次掉线", async ({ page }) => {
  await page.goto("/announcements/2026-09-09/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "2026年9月9日比赛数据赛报",
  );
  await expect(page.locator(".report-summary-grid strong")).toHaveText([
    "5",
    "14",
    "2",
    "3",
  ]);
  await expect(page.locator(".report-game-card")).toHaveCount(5);
  await expect(page.locator(".report-points-table tbody tr")).toHaveCount(16);
  const staff = page.locator(".report-staff-grid");
  await expect(staff).toContainText("FFS-Open-1 +6 分、IKILllIII +4 分");
  await expect(staff).toContainText("GGrush");
  for (const [name, cells] of [
    ["IKILllIII", ["+31", "+45", "房主、主播 +14"]],
    ["FFS-Open-1", ["0", "+20", "房主、主播（特别核定） +20"]],
    ["do''do", ["+18", "+28", "主播 +10"]],
    ["年轻", ["+5", "+5", "—"]],
    ["GGrush", ["0", "+5", "赛事数据统计员 +5"]],
    ["shougong", ["+12", "+12", "—"]],
    ["DR.Yang", ["+18", "+18", "—"]],
  ] as const) {
    const row = page
      .locator(".report-points-table tbody tr")
      .filter({ has: page.getByRole("rowheader", { name, exact: true }) });
    await expect(row.locator("td")).toHaveText([...cells]);
  }
  await expect(
    page.getByRole("complementary", { name: "赛事工作积分特别说明" }),
  ).toContainText(
    "FFS-Open-1：本日直播有解说，给予特别加分；本日赛事工作积分特别核定为 +20 分。",
  );
  await expect(page.locator("main")).not.toContainText("shovgong");
  await expect(
    page.getByRole("complementary", { name: "当日掉线核算" }),
  ).toContainText("年轻：韩服赛区当周首次掉线，豁免扣分，该盘 0 分");
  const game = page.locator(".report-game-card").nth(2);
  for (const text of ["21:12", "地主", "富农", "贫农", "年轻", "掉线"])
    await expect(game).toContainText(text);
  await expect(page.locator("main")).not.toContainText("Nightmare3");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
});

test("新闻页提供十个比赛日赛报及完整人员、积分和逐盘赛果", async ({ page }) => {
  await page.goto("/announcements/");
  const firstNewsCard = page.locator(".news-list > .news-card").first();
  await expect(firstNewsCard).toHaveClass(/news-card--scheme/u);
  await expect(firstNewsCard).toContainText("置顶 · 联赛方案");
  await expect(
    firstNewsCard.getByRole("link", { name: "阅读完整赛事方案" }),
  ).toHaveAttribute("href", "/news/dsl2-league-plan.html");
  const timelineLinks = page.locator(".news-timeline a");
  await expect(timelineLinks).toHaveCount(11);
  await expect(timelineLinks.first()).toHaveAttribute("href", "#news-scheme");
  await expect(timelineLinks.nth(1)).toContainText("2026年9月9日比赛数据赛报");
  await expect(timelineLinks.nth(1)).toHaveAttribute(
    "href",
    "#news-2026-09-09",
  );
  await timelineLinks.nth(1).click();
  await expect(page).toHaveURL(/#news-2026-09-09$/u);
  await expect(page.locator("#news-2026-09-09")).toBeInViewport();
  const reportCards = page.locator(".news-card--match-report");
  await expect(reportCards).toHaveCount(10);
  await expect(page.locator(".news-staff-thanks")).toHaveCount(10);
  await expect(reportCards.first()).toContainText(
    "感谢以上赛事工作人员的辛苦付出",
  );
  await expect(reportCards.first()).toContainText(
    /2026年9月9日\s+比赛数据赛报/u,
  );
  await expect(reportCards.first()).toContainText("星期三");
  await expect(reportCards.first()).toContainText("韩服赛区");
  await expect(reportCards.first()).toContainText(
    "房主：FFS-Open-1、IKILllIII",
  );
  await expect(reportCards.first()).toContainText(
    "主播：FFS-Open-1、IKILllIII、do''do",
  );
  await expect(reportCards.first()).toContainText("统计：GGrush");
  await expect(reportCards.nth(1)).toContainText("KK赛区");
  const districtMetaColors = await page
    .locator(".news-timeline-meta--kk, .news-timeline-meta--korea")
    .evaluateAll((items) => items.map((item) => getComputedStyle(item).color));
  expect(new Set(districtMetaColors).size).toBe(2);
  const districtBackgrounds = await reportCards.evaluateAll((cards) =>
    cards.slice(0, 2).map((card) => getComputedStyle(card).backgroundImage),
  );
  expect(districtBackgrounds[0]).not.toBe(districtBackgrounds[1]);

  await page.goto("/announcements/2026-09-07/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "2026年9月7日比赛数据赛报",
  );
  await expect(page.locator(".report-game-card")).toHaveCount(7);
  await expect(page.locator(".report-points-table tbody tr")).toHaveCount(16);
  const mergedDailyPoints = page
    .locator(".report-points-table tbody tr")
    .filter({
      has: page.getByRole("rowheader", { name: "do''do", exact: true }),
    });
  await expect(mergedDailyPoints.locator("td")).toHaveText([
    "+14",
    "+29",
    "房主、主播（兼职封顶） +15",
  ]);
  const mergedFlyPoints = page
    .locator(".report-points-table tbody tr")
    .filter({ has: page.getByRole("rowheader", { name: "fly", exact: true }) });
  await expect(mergedFlyPoints.locator("td")).toHaveText(["+44", "+44", "—"]);
  await expect(page.locator("main")).not.toContainText("beinan");
  await expect(page.locator(".report-game-card").nth(2)).toContainText(
    "do''do",
  );
  await expect(page.locator(".report-game-card").nth(3)).toContainText(
    "do''do",
  );
  await expect(
    page.getByRole("complementary", { name: "当日掉线核算" }),
  ).toContainText("豆豆：KK赛区当周首次掉线，豁免扣分，该盘 0 分");
  await expect(page.locator(".report-staff-grid")).toContainText("do''do");
  await expect(page.locator(".report-staff-grid")).toContainText("lansoov");
  await expect(page.locator(".report-staff-grid")).toContainText("GGrush");
  await expect(
    page.getByText("兼职封顶", { exact: false }).first(),
  ).toBeVisible();

  await page.goto("/announcements/2026-09-05/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "2026年9月5日比赛数据赛报",
  );
  await expect(page.locator(".report-game-card")).toHaveCount(6);
  await expect(page.locator(".report-staff-grid")).toContainText("fly、do''do");

  await page.goto("/announcements/2026-09-04/");
  await expect(
    page.getByRole("complementary", { name: "平台故障特别说明" }),
  ).toContainText("不计入每周掉线次数、不消耗豁免机会、不扣分");
  await expect(page.locator(".report-game-card")).toHaveCount(5);
  const outageEvents = page.getByRole("complementary", {
    name: "当日掉线核算",
  });
  await expect(outageEvents.locator("li")).toHaveCount(2);
  await expect(outageEvents).toContainText("五社");
  await expect(outageEvents).toContainText("豆豆");
  await expect(outageEvents).toContainText("不触发禁赛");

  await page.goto("/announcements/2026-09-02/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "2026年9月2日比赛数据赛报",
  );
  await expect(page.getByText("当晚赛事工作记录")).toBeVisible();
  await expect(
    page.getByText("兼职封顶", { exact: false }).first(),
  ).toBeVisible();
  await expect(page.locator(".report-points-table tbody tr")).toHaveCount(11);
  await expect(page.locator(".report-game-card")).toHaveCount(7);
  await expect(page.locator(".report-game-card").first()).toContainText("地主");
  await expect(page.locator(".report-game-card").first()).toContainText("富农");
  await expect(page.locator(".report-game-card").first()).toContainText("贫农");

  await page.goto("/announcements/2026-08-24/");
  await expect(page.getByText("房主", { exact: true })).toBeVisible();
  await expect(page.getByText("主播", { exact: true })).toBeVisible();
  await expect(page.getByText("赛事数据统计员", { exact: true })).toBeVisible();
  await expect(page.getByText("每人当晚固定 +10 分")).toHaveCount(2);
  await expect(page.getByText("当晚固定 +5 分")).toBeVisible();
  const sponsorThanks = page.locator(".match-sponsor-thanks");
  await expect(sponsorThanks).toContainText(
    "感谢赞助商的慷慨支持，让每一个比赛日得以顺利举行。",
  );
  await expect(
    sponsorThanks.getByRole("link", { name: "查看赞助商鸣谢" }),
  ).toHaveAttribute("href", "/rewards/#sponsor-thanks");
  await expect(page.getByText("录像总时长")).toHaveCount(0);
  await expect(page.locator(".report-points-table thead th")).toHaveCount(4);
  await expect(page.getByText("开播加分", { exact: true })).toHaveCount(0);
  await expect(page.locator(".report-points-table tbody tr")).toHaveCount(27);
  await expect(page.locator(".report-staff-grid")).toContainText("叉子别");
  const addedStreamer = page.locator(".report-points-table tbody tr").filter({
    has: page.getByRole("rowheader", { name: "叉子别", exact: true }),
  });
  await expect(addedStreamer.locator("td")).toHaveText([
    "+2",
    "+12",
    "主播 +10",
  ]);
  const renamedPlayer = page.locator(".report-points-table tbody tr").filter({
    has: page.getByRole("rowheader", { name: "digua", exact: true }),
  });
  await expect(renamedPlayer.locator("td")).toHaveText(["+14", "+14", "—"]);
  await expect(
    page.getByRole("complementary", { name: "当日掉线核算" }),
  ).toContainText("fly：KK赛区当周首次掉线，豁免扣分，该盘 0 分");
  await expect(page.locator(".report-game-card")).toHaveCount(14);
  await expect(page.locator(".report-game-card").first()).toContainText(
    "20:01",
  );
  await expect(page.locator(".report-game-card").first()).toContainText("地主");
  await expect(page.locator(".report-game-card").first()).toContainText("富农");
  await expect(page.locator(".report-game-card").first()).toContainText("贫农");
  await expect(page.getByText(/Force\s*[123]/u)).toHaveCount(0);
  await expect(
    page.getByText("兼职封顶", { exact: false }).first(),
  ).toBeVisible();
  const reportText = await page.locator("main").innerText();
  for (const mergedAlias of [
    "GGrush_Doudizhu",
    "逗地主比赛作者房",
    "嘴哥逗地主宏图VS贫矿",
    "爬来爬去",
    "111",
  ]) {
    expect(reportText).not.toContain(mergedAlias);
  }

  await page.goto("/announcements/2026-08-28/");
  const twoForceGame = page.locator(".report-game-card").first();
  await expect(twoForceGame).toContainText("地主");
  await expect(twoForceGame).toContainText("农民");
  await expect(twoForceGame).not.toContainText("富农");
  await expect(twoForceGame).not.toContainText("贫农");
  await expect(page.getByText("逗地主羞大圣").first()).toBeVisible();
  await expect(
    page.getByText("第二次掉线该盘记 −15 分", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "当日掉线核算" }),
  ).toContainText("逗地主羞大圣：KK赛区当周首次掉线，豁免扣分，该盘 0 分");
  await expect(page.getByText("掉线", { exact: true })).toBeVisible();

  await page.goto("/announcements/2026-08-29/");
  const mergedDoudou = page.locator(".report-points-table tbody tr").filter({
    has: page.getByRole("rowheader", { name: "豆豆", exact: true }),
  });
  await expect(mergedDoudou.locator("td")).toHaveText(["+17", "+17", "—"]);

  for (const day of matchReports.matchDays) {
    await page.goto(`/announcements/${day.slug}/`);
    await expect(page.locator(".report-points-table thead th")).toHaveText([
      "选手",
      "对局积分",
      "每日变动",
      "赛事工作积分",
    ]);
    await expect(page.locator("main")).not.toContainText("文永宁");
    await expect(page.locator("main")).not.toContainText("FFS_Stefsunli");
    for (const alias of ["FFS-DBS", "Gggggggggggggga", "rpg玩家"]) {
      await expect(page.locator("main")).not.toContainText(alias);
    }
    await expect(
      page.getByRole("rowheader", { name: "叉子", exact: true }),
    ).toHaveCount(0);
  }
});

test("赞助鸣谢页完整复用第一届与第二届赞助名单且移除旧奖励内容", async ({
  page,
}) => {
  await page.goto("/rewards/");
  await expect(
    page.getByRole("heading", { name: "感谢支持第二届联赛的老板" }),
  ).toBeVisible();
  await expect(page.locator("#sponsor-thanks")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "感谢一路支持 DSL 的老板" }),
  ).toBeVisible();
  await expect(
    page.locator(
      '#sponsor-thanks [aria-labelledby="dsl2-sponsors"] .home-sponsor-card',
    ),
  ).toHaveCount(dsl2Sponsors.length);
  await expect(
    page.locator(
      '#sponsor-thanks [aria-labelledby="dsl1-sponsors"] .home-sponsor-card',
    ),
  ).toHaveCount(dsl1Sponsors.length);
  await expect(page.locator(".sponsor-tribute")).toHaveCount(0);
  await expect(page.locator(".reward-card")).toHaveCount(0);
  const sponsorPageText = await page.locator("main").innerText();
  expect(sponsorPageText).not.toContain("奖励与赞助");
  expect(sponsorPageText).not.toContain("1,200 元");

  await page.goto("/playoffs/");
  await expect(
    page.locator('.prize-list[aria-label="韩服 8R 奖金"] li'),
  ).toHaveCount(4);
  await expect(page.getByText("第四、第五名各 50元")).toBeVisible();
});

test("规则总览使用单一表格且地图页标明 8R 地图缺位", async ({ page }) => {
  await page.goto("/rules/");
  await expect(page.getByText("第一周至第六周")).toBeVisible();
  await expect(page.getByText("十周赛季，分为两个阶段")).toBeVisible();
  await expect(page.locator(".rules-overview tbody tr")).toHaveCount(8);
  await expect(
    page.locator("#schedule > .container > :first-child"),
  ).toHaveClass(/rules-scheme-callout/u);
  await expect(
    page
      .locator(".rules-scheme-callout")
      .getByRole("link", { name: "阅读完整赛事方案" }),
  ).toHaveAttribute("href", "/news/dsl2-league-plan.html");
  await expect(page.locator("main .content-grid")).toHaveCount(0);
  await expect(page.getByText("游戏角色积分规则")).toBeVisible();
  await expect(page.getByText("直播与赛事志愿工作")).toBeVisible();
  await expect(page.getByText("房主", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("主播", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("统计", { exact: true }).first()).toBeVisible();
  const workPointValues = page.locator(
    ".points-grid .panel:nth-child(2) .points-value",
  );
  await expect(workPointValues.nth(0)).toContainText("+10");
  await expect(workPointValues.nth(1)).toContainText("+10");
  await expect(workPointValues.nth(2)).toContainText("+5");
  await expect(
    page.getByText("赛事工作积分合计最高为", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("掉线者该盘扣除 15 点积分", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("积分允许扣至负数", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("其余 7 名玩家", { exact: false })).toBeVisible();
  await expect(page.getByText("第 2 次掉线后", { exact: false })).toBeVisible();
  await expect(
    page.getByText("各有一次掉线豁免机会", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("另一赛区的参赛资格不受影响", { exact: false }),
  ).toBeVisible();

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

test("旧赛程地址永久跳转到合并后的赛程与规则页面", async ({ page }) => {
  await page.goto("/schedule/");
  await expect(page).toHaveURL(/\/rules\/#schedule$/u);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "第二届赛程与规则",
  );
  await expect(
    page.locator("#schedule .date-banner").getByText("2026年8月24日", {
      exact: true,
    }),
  ).toBeVisible();
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
  expect(html).toContain("<b>房主</b><b>+10 分</b>");
  expect(html).toContain("<b>主播</b><b>+10 分</b>");
  expect(html).toContain("<b>统计</b><b>+5 分</b>");
  expect(html).toContain("赛事工作积分合计最高为 15 分");
  expect(html).toContain("该盘扣除 15 点积分且允许扣至负数");
  expect(html).toContain("同一周、同一赛区第 2 次掉线后");
  expect(html).toContain("各有一次掉线豁免机会");
  expect(html).toContain("不消耗每周豁免");
  expect(html).not.toContain("第 3 次掉线后");
  expect(html).not.toContain("+2 分 / 盘");
  for (const range of [
    "第 6—10 名",
    "第 11—20 名",
    "第 21—30 名",
    "第 31—40 名",
    "第 41 名及以后",
  ]) {
    expect(html).toContain(range);
  }
  expect(html).toContain("积分榜展示白银及以上选手");
  expect(html).toContain("常规赛前 30 名");
  expect(html).not.toContain("分界线待定");
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
    "第二届赛程与规则",
  );
  await expect(page.getByText("地主", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("房主", { exact: true }).first()).toBeVisible();

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
