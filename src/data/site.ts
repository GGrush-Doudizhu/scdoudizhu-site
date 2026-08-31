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
  { href: "/rewards/", label: "赞助鸣谢" },
  { href: "/standings/", label: "常规赛积分榜" },
  { href: "/rules/", label: "赛程与规则" },
  { href: "/playoffs/", label: "季后赛" },
  { href: "/announcements/", label: "新闻" },
  { href: "/maps/", label: "地图下载" },
] as const;
