import disconnectPolicy from "../../src/data/disconnect-policy.json" with { type: "json" };

export { disconnectPolicy };

// Explicit daily work totals approved by the administrator, with a public reason.
// These replace the normal capped work award only for the named staff member.
export function resolveWorkPointOverrides(metadata, canonicalName) {
  const overrides = new Map();
  if (metadata.workPointOverrides === undefined) return overrides;
  if (!Array.isArray(metadata.workPointOverrides)) {
    throw new Error("workPointOverrides 必须是特别核定记录数组。");
  }
  const staff = new Set(
    [...metadata.host, ...metadata.streamer, metadata.statistician].map(
      canonicalName,
    ),
  );
  for (const award of metadata.workPointOverrides) {
    if (
      !award ||
      typeof award.name !== "string" ||
      !award.name.trim() ||
      !Number.isSafeInteger(award.points) ||
      award.points < 0 ||
      typeof award.reason !== "string" ||
      !award.reason.trim()
    ) {
      throw new Error(
        "workPointOverrides 必须包含有效姓名、非负整数积分和核定原因。",
      );
    }
    const name = canonicalName(award.name);
    if (!staff.has(name) || overrides.has(name)) {
      throw new Error(
        `workPointOverrides 非当日工作人员或归并后重复：${award.name}`,
      );
    }
    overrides.set(name, { points: award.points, reason: award.reason.trim() });
  }
  return overrides;
}

// Optional administrator-confirmed host allocations, keyed by source name.
// Resolve identities before applying an allocation or the daily work cap.
export function resolveHostPoints(metadata, canonicalName) {
  const awards = new Map();
  if (metadata.hostPoints === undefined) return awards;
  if (
    !metadata.hostPoints ||
    Array.isArray(metadata.hostPoints) ||
    typeof metadata.hostPoints !== "object"
  ) {
    throw new Error("hostPoints 必须是房主名称到积分的对象。");
  }
  const hosts = new Set(metadata.host.map(canonicalName));
  for (const [sourceName, points] of Object.entries(metadata.hostPoints)) {
    const name = canonicalName(sourceName);
    if (
      !hosts.has(name) ||
      awards.has(name) ||
      !Number.isInteger(points) ||
      points < 0 ||
      points > 10
    ) {
      throw new Error(`hostPoints 分配无效或归并后重复：${sourceName}`);
    }
    awards.set(name, points);
  }
  return awards;
}

export function weekForDate(date) {
  const monday = new Date(`${date}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

export function pointsFor(force, won) {
  if (force === 1) return won ? 12 : 3;
  if (force === 2 || force === 3) return won ? 8 : 2;
  throw new Error(`无法识别的 force/team：${force}`);
}

// Call chronologically, using names already normalized through same_name.csv.
export function createDisconnectTracker() {
  const counts = new Map();
  const keyFor = (displayName, date, platform) =>
    JSON.stringify([displayName, platform, weekForDate(date).start]);

  return {
    isSuspended(displayName, date, platform) {
      return (
        (counts.get(keyFor(displayName, date, platform)) ?? 0) >
        disconnectPolicy.weeklyFreeDisconnects
      );
    },
    record(displayName, date, platform) {
      const week = weekForDate(date);
      if (Object.hasOwn(disconnectPolicy.excludedMatchdays, date)) {
        return {
          status: "platform-exempt",
          weekStart: week.start,
          occurrence: null,
          points: 0,
          suspensionThrough: null,
        };
      }
      const key = keyFor(displayName, date, platform);
      const occurrence = (counts.get(key) ?? 0) + 1;
      counts.set(key, occurrence);
      const exempt = occurrence <= disconnectPolicy.weeklyFreeDisconnects;
      return {
        status: exempt ? "weekly-exempt" : "penalty",
        weekStart: week.start,
        occurrence,
        points: exempt ? 0 : disconnectPolicy.penaltyPoints,
        suspensionThrough: exempt ? null : week.end,
      };
    },
  };
}
