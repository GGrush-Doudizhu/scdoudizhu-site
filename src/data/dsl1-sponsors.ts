export const dsl1SponsorTiers = [
  { id: "platinum", name: "铂金赞助商", range: "第 1 名" },
  { id: "diamond", name: "钻石赞助商", range: "第 2—3 名" },
  { id: "gold", name: "黄金赞助商", range: "第 4—10 名" },
  { id: "silver", name: "白银赞助商", range: "其余赞助老板" },
] as const;

export type Dsl1SponsorTier = (typeof dsl1SponsorTiers)[number]["id"];

export const dsl1Sponsors: ReadonlyArray<{
  rank: number;
  tier: Dsl1SponsorTier;
  name: string;
  avatar: string;
}> = [
  {
    rank: 1,
    tier: "platinum",
    name: "DBS",
    avatar: "/assets/sponsors/dsl1/DBS.jpg",
  },
  {
    rank: 2,
    tier: "diamond",
    name: "TianW",
    avatar: "/assets/sponsors/dsl1/TianW.jpg",
  },
  {
    rank: 3,
    tier: "diamond",
    name: "zhendeniu",
    avatar: "/assets/sponsors/dsl1/zhendeniu.jpg",
  },
  {
    rank: 4,
    tier: "gold",
    name: "fly",
    avatar: "/assets/sponsors/dsl1/fly.jpg",
  },
  {
    rank: 5,
    tier: "gold",
    name: "VGer_Whc",
    avatar: "/assets/sponsors/dsl1/VGer_Whc.jpg",
  },
  {
    rank: 6,
    tier: "gold",
    name: "Wayenniuniu",
    avatar: "/assets/sponsors/dsl1/Wayenniuniu.jpg",
  },
  {
    rank: 7,
    tier: "gold",
    name: "paijipao",
    avatar: "/assets/sponsors/dsl1/paijipao.jpg",
  },
  {
    rank: 8,
    tier: "gold",
    name: "jiangfen",
    avatar: "/assets/sponsors/dsl1/jiangfen.jpg",
  },
  {
    rank: 9,
    tier: "gold",
    name: "DDR",
    avatar: "/assets/sponsors/dsl1/DDR.jpg",
  },
  {
    rank: 10,
    tier: "gold",
    name: "VIM",
    avatar: "/assets/sponsors/dsl1/VIM.jpg",
  },
  {
    rank: 11,
    tier: "silver",
    name: "LawyerChen",
    avatar: "/assets/sponsors/dsl1/LawyerChen.jpg",
  },
  {
    rank: 12,
    tier: "silver",
    name: "lxllll",
    avatar: "/assets/sponsors/dsl1/lxllll.jpg",
  },
  {
    rank: 13,
    tier: "silver",
    name: "lkILIIII",
    avatar: "/assets/sponsors/dsl1/lkILIIII.jpg",
  },
  {
    rank: 14,
    tier: "silver",
    name: "Koxulka",
    avatar: "/assets/sponsors/dsl1/Koxulka.jpg",
  },
  {
    rank: 15,
    tier: "silver",
    name: "blackdos",
    avatar: "/assets/sponsors/dsl1/blackdos.jpg",
  },
  {
    rank: 16,
    tier: "silver",
    name: "44L",
    avatar: "/assets/sponsors/dsl1/44L.jpg",
  },
  {
    rank: 17,
    tier: "silver",
    name: "Lansoov",
    avatar: "/assets/sponsors/dsl1/Lansoov.jpg",
  },
  {
    rank: 18,
    tier: "silver",
    name: "tuyu",
    avatar: "/assets/sponsors/dsl1/tuyu.jpg",
  },
  {
    rank: 19,
    tier: "silver",
    name: "Open-1",
    avatar: "/assets/sponsors/dsl1/Open-1.jpg",
  },
  {
    rank: 20,
    tier: "silver",
    name: "xiaomabaoli",
    avatar: "/assets/sponsors/dsl1/xiaomabaoli.jpg",
  },
  {
    rank: 21,
    tier: "silver",
    name: "Luckyy2023",
    avatar: "/assets/sponsors/dsl1/Luckyy2023.jpg",
  },
  {
    rank: 22,
    tier: "silver",
    name: "Kakaru",
    avatar: "/assets/sponsors/dsl1/Kakaru.jpg",
  },
  {
    rank: 23,
    tier: "silver",
    name: "mosuo",
    avatar: "/assets/sponsors/dsl1/mosuo.jpg",
  },
  {
    rank: 24,
    tier: "silver",
    name: "Kiss",
    avatar: "/assets/sponsors/dsl1/Kiss.jpg",
  },
];
