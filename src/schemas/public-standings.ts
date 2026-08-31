import { z } from "zod";

import rawStandings from "../data/public-standings.json";

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
    entries: z.array(entrySchema).max(25),
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
    let previousRank = 0;

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

      const expectedTier =
        entry.rank === 1
          ? "王者"
          : entry.rank <= 5
            ? "星耀"
            : entry.rank <= 15
              ? "钻石"
              : "铂金";
      if (entry.tier !== expectedTier) {
        context.addIssue({
          code: "custom",
          message: "公开积分榜段位必须符合铂金及以上的名次分档。",
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

      if (entry.rank < previousRank) {
        context.addIssue({
          code: "custom",
          message: "积分榜必须按名次升序排列。",
          path: ["entries", index, "rank"],
        });
      }
      previousRank = entry.rank;
    });
  });

export type PublicStandings = z.infer<typeof publicStandingsSchema>;
export type PublicStandingEntry = PublicStandings["entries"][number];

export const publicStandings = publicStandingsSchema.parse(rawStandings);
