import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  createDisconnectTracker,
  pointsFor,
  weekForDate,
} from "./lib/match-scoring.mjs";

test("normal landlord and farmer results retain the original scoring", () => {
  assert.deepEqual([pointsFor(1, true), pointsFor(1, false)], [12, 3]);
  for (const force of [2, 3]) {
    assert.deepEqual([pointsFor(force, true), pointsFor(force, false)], [8, 2]);
  }
  assert.throws(() => pointsFor(4, true));
});

test("second disconnect costs 15 and suspends only the same player and district", () => {
  const tracker = createDisconnectTracker();
  assert.equal(tracker.record("fly", "2026-08-24", "KK").points, 0);
  assert.equal(tracker.isSuspended("fly", "2026-08-28", "KK"), false);
  const second = tracker.record("fly", "2026-08-28", "KK");
  assert.deepEqual(second, {
    status: "penalty",
    weekStart: "2026-08-24",
    occurrence: 2,
    points: -15,
    suspensionThrough: "2026-08-30",
  });
  assert.equal(tracker.isSuspended("fly", "2026-08-28", "KK"), true);
  assert.equal(tracker.isSuspended("fly", "2026-08-29", "韩服"), false);
  assert.equal(tracker.isSuspended("另一选手", "2026-08-28", "KK"), false);
  assert.equal(tracker.record("fly", "2026-08-29", "韩服").points, 0);
  assert.equal(tracker.record("另一选手", "2026-08-28", "KK").points, 0);
});

test("Korean district suspension leaves KK eligible, and Monday resets both", () => {
  const tracker = createDisconnectTracker();
  tracker.record("选手", "2026-08-26", "韩服");
  tracker.record("选手", "2026-08-29", "韩服");
  assert.equal(tracker.isSuspended("选手", "2026-08-30", "韩服"), true);
  assert.equal(tracker.isSuspended("选手", "2026-08-30", "KK"), false);
  assert.equal(tracker.record("选手", "2026-08-30", "KK").points, 0);
  assert.equal(tracker.isSuspended("选手", "2026-08-31", "韩服"), false);
  assert.equal(tracker.record("选手", "2026-09-02", "韩服").occurrence, 1);
  assert.equal(tracker.record("选手", "2026-08-31", "KK").occurrence, 1);
});

test("platform outage never consumes a waiver or increments an existing count", () => {
  const tracker = createDisconnectTracker();
  tracker.record("已有一次", "2026-08-31", "KK");
  for (const name of ["已有一次", "尚未掉线"]) {
    for (let index = 0; index < 3; index += 1) {
      assert.deepEqual(tracker.record(name, "2026-09-04", "KK"), {
        status: "platform-exempt",
        weekStart: "2026-08-31",
        occurrence: null,
        points: 0,
        suspensionThrough: null,
      });
      assert.equal(tracker.isSuspended(name, "2026-09-04", "KK"), false);
    }
  }
  assert.equal(tracker.record("尚未掉线", "2026-09-05", "KK").occurrence, 1);
  assert.equal(tracker.record("已有一次", "2026-09-05", "KK").points, -15);
});

test("calendar weeks run Monday through Sunday across month and year boundaries", () => {
  assert.deepEqual(weekForDate("2026-08-30"), {
    start: "2026-08-24",
    end: "2026-08-30",
  });
  assert.deepEqual(weekForDate("2026-08-31"), {
    start: "2026-08-31",
    end: "2026-09-06",
  });
  assert.deepEqual(weekForDate("2027-01-01"), {
    start: "2026-12-28",
    end: "2027-01-03",
  });
});

test("published reports preserve the corrected staff award and all four exemptions", async () => {
  const reports = JSON.parse(
    await readFile(
      new URL("../src/data/match-reports.json", import.meta.url),
      "utf8",
    ),
  );
  const openingDay = reports.matchDays.find((day) => day.date === "2026-08-24");
  assert.ok(openingDay.staff.streamers.includes("叉子别"));
  const streamer = openingDay.pointChanges.find(
    (player) => player.displayName === "叉子别",
  );
  assert.equal(streamer.workPoints, 10);
  assert.ok(streamer.contributions.includes("主播"));
  const events = reports.matchDays
    .filter((day) => day.date <= "2026-09-05")
    .flatMap((day) => day.disconnectEvents);
  assert.equal(events.length, 4);
  assert.equal(
    events.filter((event) => event.status === "weekly-exempt").length,
    2,
  );
  assert.equal(
    events.filter((event) => event.status === "platform-exempt").length,
    2,
  );
  assert.ok(
    events.every(
      (event) => event.points === 0 && event.suspensionThrough === null,
    ),
  );
  const outageDay = reports.matchDays.find((day) => day.date === "2026-09-04");
  assert.equal(outageDay.summary.matchCount, 5);
  assert.equal(
    outageDay.pointChanges.find((player) => player.displayName === "do''do")
      .workPoints,
    15,
  );
  assert.ok(outageDay.pointChanges.some((player) => player.matchPoints > 0));
});
