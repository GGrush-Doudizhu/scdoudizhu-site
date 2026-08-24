export const dsl1SponsorTiers = [
  { id: "platinum", name: "铂金赞助商" },
  { id: "diamond", name: "钻石赞助商" },
  { id: "gold", name: "黄金赞助商" },
  { id: "silver", name: "白银赞助商" },
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
    avatar: "/assets/sponsors/dsl1/DBS.webp",
  },
  {
    rank: 2,
    tier: "diamond",
    name: "TianW",
    avatar: "/assets/sponsors/dsl1/TianW.webp",
  },
  {
    rank: 3,
    tier: "diamond",
    name: "zhendeniu",
    avatar: "/assets/sponsors/dsl1/zhendeniu.webp",
  },
  {
    rank: 4,
    tier: "gold",
    name: "fly",
    avatar: "/assets/sponsors/dsl1/fly.webp",
  },
  {
    rank: 5,
    tier: "gold",
    name: "VGer_Whc",
    avatar: "/assets/sponsors/dsl1/VGer_Whc.webp",
  },
  {
    rank: 6,
    tier: "gold",
    name: "Wayenniuniu",
    avatar: "/assets/sponsors/dsl1/Wayenniuniu.webp",
  },
  {
    rank: 7,
    tier: "gold",
    name: "paijipao",
    avatar: "/assets/sponsors/dsl1/paijipao.webp",
  },
  {
    rank: 8,
    tier: "gold",
    name: "jiangfen",
    avatar: "/assets/sponsors/dsl1/jiangfen.webp",
  },
  {
    rank: 9,
    tier: "gold",
    name: "DDR",
    avatar: "/assets/sponsors/dsl1/DDR.webp",
  },
  {
    rank: 10,
    tier: "gold",
    name: "VIM",
    avatar: "/assets/sponsors/dsl1/VIM.webp",
  },
  {
    rank: 11,
    tier: "silver",
    name: "LawyerChen",
    avatar: "/assets/sponsors/dsl1/LawyerChen.webp",
  },
  {
    rank: 12,
    tier: "silver",
    name: "lxllll",
    avatar: "/assets/sponsors/dsl1/lxllll.webp",
  },
  {
    rank: 13,
    tier: "silver",
    name: "lkILIIII",
    avatar: "/assets/sponsors/dsl1/lkILIIII.webp",
  },
  {
    rank: 14,
    tier: "silver",
    name: "Koxulka",
    avatar: "/assets/sponsors/dsl1/Koxulka.webp",
  },
  {
    rank: 15,
    tier: "silver",
    name: "blackdos",
    avatar: "/assets/sponsors/dsl1/blackdos.webp",
  },
  {
    rank: 16,
    tier: "silver",
    name: "44L",
    avatar: "/assets/sponsors/dsl1/44L.webp",
  },
  {
    rank: 17,
    tier: "silver",
    name: "Lansoov",
    avatar: "/assets/sponsors/dsl1/Lansoov.webp",
  },
  {
    rank: 18,
    tier: "silver",
    name: "tuyu",
    avatar: "/assets/sponsors/dsl1/tuyu.webp",
  },
  {
    rank: 19,
    tier: "silver",
    name: "Open-1",
    avatar: "/assets/sponsors/dsl1/Open-1.webp",
  },
  {
    rank: 20,
    tier: "silver",
    name: "xiaomabaoli",
    avatar: "/assets/sponsors/dsl1/xiaomabaoli.webp",
  },
  {
    rank: 21,
    tier: "silver",
    name: "Luckyy2023",
    avatar: "/assets/sponsors/dsl1/Luckyy2023.webp",
  },
  {
    rank: 22,
    tier: "silver",
    name: "Kakaru",
    avatar: "/assets/sponsors/dsl1/Kakaru.webp",
  },
  {
    rank: 23,
    tier: "silver",
    name: "mosuo",
    avatar: "/assets/sponsors/dsl1/mosuo.webp",
  },
  {
    rank: 24,
    tier: "silver",
    name: "Kiss",
    avatar: "/assets/sponsors/dsl1/Kiss.webp",
  },
];
