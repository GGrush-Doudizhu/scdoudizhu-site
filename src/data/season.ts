export const season = {
  id: "dsl2",
  name: "第二届 DSL 斗地主星际联赛",
  timezone: "Asia/Singapore",
  startDate: "2026年8月24日",
  regularSeasonRange: "8月24日至10月3日",
  playoffRange: "10月5日至10月31日",
  startTime: "20:00",
  endTime: "22:00",
  regularSeasonWeeks: 6,
  playoffWeeks: 4,
  totalWeeks: 10,
  registration: "无需提前报名，比赛时段进入比赛房即可参加常规赛。",
} as const;

export const weeklySlots = [
  { weekday: "周一", platform: "KK", phase: "常规赛 / KK 战队联赛" },
  { weekday: "周三", platform: "韩服", phase: "常规赛 / 韩服 8R" },
  { weekday: "周五", platform: "KK", phase: "常规赛 / KK 战队联赛" },
  { weekday: "周六", platform: "韩服", phase: "常规赛 / 韩服 8R" },
] as const;

export const matchPoints = [
  { role: "地主", result: "获胜", points: 12 },
  { role: "地主", result: "失利", points: 3 },
  { role: "农民", result: "获胜", points: 8 },
  { role: "农民", result: "失利", points: 2 },
] as const;

export const servicePoints = [
  { role: "主机", points: 30, note: "负责当晚比赛房，可同时参赛" },
  { role: "主播", points: 30, note: "常规赛不强制安排" },
  { role: "统计", points: 20, note: "按模板录入当晚赛果" },
] as const;

export const tiers = [
  { name: "王者", range: "第 1 名" },
  { name: "星耀", range: "第 2—5 名" },
  { name: "钻石", range: "第 6—15 名" },
  { name: "铂金", range: "第 16—25 名" },
  { name: "黄金", range: "赛季成长段位" },
  { name: "白银", range: "赛季成长段位" },
  { name: "青铜", range: "积分征程起点" },
] as const;
