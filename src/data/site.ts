export const site = {
  name: "斗地主星际联赛",
  shortName: "DSL",
  seasonName: "第二届",
  description:
    "第二届 DSL 斗地主星际联赛官方网站：查看积分榜、赛程、赛事规则、季后赛与最新通知。",
  url: "https://scdoudizhu.com",
  locale: "zh-CN",
} as const;

export const navigation = [
  { href: "/", label: "首页" },
  { href: "/standings/", label: "积分榜" },
  { href: "/schedule/", label: "赛程" },
  { href: "/rules/", label: "规则" },
  { href: "/playoffs/", label: "季后赛" },
  { href: "/announcements/", label: "通知" },
] as const;
