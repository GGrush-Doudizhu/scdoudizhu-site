export const site = {
  name: "星际斗地主联赛",
  shortName: "DSL",
  seasonName: "第二届",
  description:
    "第二届 DSL 星际斗地主联赛官方网站：查看常规赛积分榜、赛程、比赛规则、季后赛与赛事新闻。",
  url: "https://scdoudizhu.com",
  locale: "zh-CN",
} as const;

export const navigation = [
  { href: "/", label: "首页" },
  { href: "/standings/", label: "常规赛积分榜" },
  { href: "/schedule/", label: "赛程" },
  { href: "/rules/", label: "规则" },
  { href: "/playoffs/", label: "季后赛" },
  { href: "/announcements/", label: "新闻" },
] as const;
