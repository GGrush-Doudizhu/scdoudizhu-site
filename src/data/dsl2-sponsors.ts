export const dsl2SponsorTiers = [
  { id: "platinum", name: "铂金赞助商" },
  { id: "diamond", name: "钻石赞助商" },
] as const;

export type Dsl2SponsorTier = (typeof dsl2SponsorTiers)[number]["id"];

export const dsl2Sponsors: ReadonlyArray<{
  tier: Dsl2SponsorTier;
  name: string;
  avatar: string;
}> = [
  {
    tier: "platinum",
    name: "DBS",
    avatar: "/assets/sponsors/dsl2/DBS.webp",
  },
  {
    tier: "diamond",
    name: "WoShiLaoCaiNiao",
    avatar: "/assets/sponsors/dsl2/WoShiLaoCaiNiao.webp",
  },
];
