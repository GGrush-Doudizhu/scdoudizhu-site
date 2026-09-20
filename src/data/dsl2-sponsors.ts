import sponsors from "./dsl2-sponsor-profiles.json" with { type: "json" };

export const dsl2SponsorTiers = [
  { id: "platinum", name: "铂金赞助商" },
  { id: "diamond", name: "钻石赞助商" },
  { id: "gold", name: "黄金赞助商" },
  { id: "silver", name: "白银赞助商" },
] as const;

export type Dsl2SponsorTier = (typeof dsl2SponsorTiers)[number]["id"];

export const dsl2Sponsors: ReadonlyArray<{
  tier: Dsl2SponsorTier;
  name: string;
  avatar: string;
}> = sponsors.map((sponsor) => {
  const tier = dsl2SponsorTiers.find((entry) => entry.id === sponsor.tier);
  if (!tier) throw new Error(`未知赞助等级：${sponsor.tier}`);
  return { ...sponsor, tier: tier.id };
});
