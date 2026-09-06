import disconnectPolicy from "../../src/data/disconnect-policy.json" with { type: "json" };

export { disconnectPolicy };

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
