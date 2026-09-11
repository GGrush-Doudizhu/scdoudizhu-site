import { z } from "zod";

import rawStandings from "../data/public-standings.json" with { type: "json" };
import standingTiers from "../data/standing-tiers.json" with { type: "json" };
import standingsVisibility from "../data/standings-visibility.json" with { type: "json" };

const tierSchema = z.enum([
  "王者",
  "星耀",
  "钻石",
  "铂金",
  "黄金",
  "白银",
  "青铜",
]);

const entrySchema = z
  .object({
    rank: z.number().int().positive(),
    displayName: z.string().trim().min(1).max(40),
    points: z.number().int(),
    tier: tierSchema,
    gamesPlayed: z.number().int().positive().optional(),
    winRate: z.number().min(0).max(1).optional(),
  })
  .strict();

export const publicStandingsSchema = z
  .object({
    schemaVersion: z.literal(1),
    season: z.literal("dsl2"),
    exportId: z.string().trim().min(1).max(80),
    standingsAsOf: z.iso.datetime({ offset: true }).nullable(),
    publishedAt: z.iso.datetime({ offset: true }).nullable(),
    entries: z.array(entrySchema).max(standingsVisibility.publicStandingLimit),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.entries.length > 0 && (!data.standingsAsOf || !data.publishedAt)) {
      context.addIssue({
        code: "custom",
        message: "非空积分榜必须提供统计截止时间和发布时间。",
        path: ["standingsAsOf"],
      });
    }

    const names = new Set<string>();

    data.entries.forEach((entry, index) => {
      const normalizedName = entry.displayName.toLocaleLowerCase("zh-CN");
      if (names.has(normalizedName)) {
        context.addIssue({
          code: "custom",
          message: `公开显示名称重复：${entry.displayName}`,
          path: ["entries", index, "displayName"],
        });
      }
      names.add(normalizedName);

      if (entry.rank > standingsVisibility.publicStandingLimit) {
        context.addIssue({
          code: "custom",
          message: "公开积分榜只展示白银及以上的前 40 名选手。",
          path: ["entries", index, "rank"],
        });
      }

      const expectedTier = standingTiers.find(
        (tier) => tier.maxRank === null || entry.rank <= tier.maxRank,
      )?.name;
      if (entry.tier !== expectedTier) {
        context.addIssue({
          code: "custom",
          message: "公开积分榜段位必须符合七档名次划分。",
          path: ["entries", index, "tier"],
        });
      }

      if (entry.rank <= 5) {
        if (entry.gamesPlayed === undefined || entry.winRate === undefined) {
          context.addIssue({
            code: "custom",
            message: "王者和星耀选手必须展示总场数与总胜率。",
            path: ["entries", index],
          });
        }
      } else if (
        entry.gamesPlayed !== undefined ||
        entry.winRate !== undefined
      ) {
        context.addIssue({
          code: "custom",
          message: "钻石及以下选手不得公开总场数或胜率。",
          path: ["entries", index],
        });
      }

      if (entry.rank !== index + 1) {
        context.addIssue({
          code: "custom",
          message: "完整积分榜名次必须从 1 开始连续排列。",
          path: ["entries", index, "rank"],
        });
      }
    });
  });

export type PublicStandings = z.infer<typeof publicStandingsSchema>;
export type PublicStandingEntry = PublicStandings["entries"][number];

export const publicStandings = publicStandingsSchema.parse(rawStandings);
