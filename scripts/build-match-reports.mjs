import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const matchDataRoot = path.join(projectRoot, "match-data");
const sameNamePath = path.join(matchDataRoot, "same_name.csv");
const reportsOutputPath = path.join(
  projectRoot,
  "src",
  "data",
  "match-reports.json",
);
const standingsOutputPath = path.join(
  projectRoot,
  "src",
  "data",
  "public-standings.json",
);
const dsl2DataOutputRoot = path.join(projectRoot, "data-source", "dsl2");
const masterDataOutputPath = path.join(dsl2DataOutputRoot, "dsl2-master.json");
const fullStandingsOutputPath = path.join(
  dsl2DataOutputRoot,
  "full-standings-latest.csv",
);
const checkOnly = process.argv.includes("--check");

const publishedAt = "2026-09-01T01:00:00+08:00";
const publicStandingLimit = 25;
const workPointCap = 15;
const workRoleRules = {
  host: { label: "房主", points: 10 },
  streamer: { label: "主播", points: 10 },
  statistician: { label: "赛事数据统计员", points: 5 },
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseSameNameCsv(text) {
  const groups = text
    .replace(/^\uFEFF/u, "")
    .split(/\r?\n/u)
    .map((line) =>
      line
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    )
    .filter((names) => names.length > 0)
    .map(([primaryName, ...aliases]) => ({ primaryName, aliases }));
  const aliasTargets = new Map();
  for (const group of groups) {
    for (const name of [group.primaryName, ...group.aliases]) {
      const existing = aliasTargets.get(name);
      assert(
        !existing || existing === group.primaryName,
        `same_name.csv 中的名称“${name}”被分配给多个主名称。`,
      );
      aliasTargets.set(name, group.primaryName);
    }
  }
  function canonicalName(name) {
    const trimmed = name.trim();
    return aliasTargets.get(trimmed) ?? trimmed;
  }
  return { groups, canonicalName };
}

function pointsFor(force, won, disconnected) {
  if (disconnected) return -20;
  if (force === 1) return won ? 12 : 3;
  if (force === 2 || force === 3) return won ? 8 : 2;
  throw new Error(`无法识别的 force/team：${force}`);
}

function roleForForce(force, forceCount) {
  if (force === 1) return "地主";
  if (forceCount === 3 && force === 2) return "富农";
  if (forceCount === 3 && force === 3) return "贫农";
  return "农民";
}

function tierForRank(rank) {
  if (rank === 1) return "王者";
  if (rank <= 5) return "星耀";
  if (rank <= 15) return "钻石";
  if (rank <= publicStandingLimit) return "铂金";
  return null;
}

function platformForDate(dateValue) {
  const weekday = dateValue.getUTCDay();
  if (weekday === 1 || weekday === 5) return "KK";
  if (weekday === 3 || weekday === 6) return "韩服";
  throw new Error(`比赛日不在周一、三、五、六：${dateValue.toISOString()}`);
}

function isoDate(compactDate) {
  return `${compactDate.slice(0, 4)}-${compactDate.slice(4, 6)}-${compactDate.slice(6, 8)}`;
}

function timeLabel(fileName) {
  const compactTime = fileName.slice(0, 6);
  assert(/^\d{6}$/u.test(compactTime), `录像文件名缺少时间：${fileName}`);
  return `${compactTime.slice(0, 2)}:${compactTime.slice(2, 4)}`;
}

function mapName(fileName) {
  return fileName.replace(/^\d{6},/u, "").replace(/\.rep$/iu, "");
}

function durationLabel(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours === 0) return `${minutes} 分钟`;
  return `${hours} 小时 ${minutes} 分钟`;
}

function uniqueNames(names) {
  return [...new Set(names)];
}

function initialPointChange(displayName) {
  return {
    displayName,
    matchPoints: 0,
    workPoints: 0,
    total: 0,
    contributions: [],
    workPointsCapped: false,
  };
}

function initialPlayerTotal(displayName) {
  return {
    displayName,
    matchPoints: 0,
    workPoints: 0,
    points: 0,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    disconnects: 0,
    landlordGames: 0,
    landlordWins: 0,
    richFarmerGames: 0,
    richFarmerWins: 0,
    poorFarmerGames: 0,
    poorFarmerWins: 0,
    farmerGames: 0,
    hostDays: 0,
    streamerDays: 0,
    statisticianDays: 0,
  };
}

function addMatchPoints(pointChanges, playerTotals, displayName, points) {
  const change =
    pointChanges.get(displayName) ?? initialPointChange(displayName);
  change.matchPoints += points;
  change.total += points;
  pointChanges.set(displayName, change);
  const total =
    playerTotals.get(displayName) ?? initialPlayerTotal(displayName);
  total.matchPoints += points;
  total.points += points;
  playerTotals.set(displayName, total);
}

function addWorkPoints(pointChanges, playerTotals, displayName, roleKeys) {
  const contributions = roleKeys.map((roleKey) => workRoleRules[roleKey].label);
  const uncappedPoints = roleKeys.reduce(
    (sum, roleKey) => sum + workRoleRules[roleKey].points,
    0,
  );
  const points = Math.min(uncappedPoints, workPointCap);
  const capped = uncappedPoints > workPointCap;
  const change =
    pointChanges.get(displayName) ?? initialPointChange(displayName);
  change.workPoints += points;
  change.total += points;
  change.contributions = contributions;
  change.workPointsCapped = capped;
  pointChanges.set(displayName, change);
  const total =
    playerTotals.get(displayName) ?? initialPlayerTotal(displayName);
  total.workPoints += points;
  total.points += points;
  if (roleKeys.includes("host")) total.hostDays += 1;
  if (roleKeys.includes("streamer")) total.streamerDays += 1;
  if (roleKeys.includes("statistician")) total.statisticianDays += 1;
  playerTotals.set(displayName, total);
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function standingsCsv(entries) {
  const columns = [
    ["rank", "名次"],
    ["displayName", "主名称"],
    ["points", "总积分"],
    ["matchPoints", "对局积分"],
    ["workPoints", "赛事工作积分"],
    ["gamesPlayed", "参赛盘数"],
    ["wins", "胜"],
    ["losses", "负"],
    ["disconnects", "掉线"],
    ["landlordGames", "地主盘数"],
    ["landlordWins", "地主胜场"],
    ["richFarmerGames", "富农盘数"],
    ["richFarmerWins", "富农胜场"],
    ["poorFarmerGames", "贫农盘数"],
    ["poorFarmerWins", "贫农胜场"],
    ["farmerGames", "双阵营地图农民盘数"],
    ["hostDays", "担任房主比赛日"],
    ["streamerDays", "担任主播比赛日"],
    ["statisticianDays", "担任统计员比赛日"],
    ["tier", "公开段位"],
    ["publiclyListed", "是否公开展示"],
  ];
  const rows = [
    columns.map(([, label]) => label),
    ...entries.map((entry) => columns.map(([key]) => entry[key])),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

async function buildData() {
  const { groups: identityGroups, canonicalName } = parseSameNameCsv(
    await readFile(sameNamePath, "utf8"),
  );
  const directoryEntries = await readdir(matchDataRoot, {
    withFileTypes: true,
  });
  const matchdayDirectories = directoryEntries
    .filter((entry) => entry.isDirectory() && /^\d{8}$/u.test(entry.name))
    .map((entry) => entry.name)
    .sort();
  assert(matchdayDirectories.length > 0, "match-data 中没有比赛日目录。");

  const masterMatchDays = [];
  const publicMatchDays = [];
  const playerTotals = new Map();
  const observedNames = new Map();

  for (const compactDate of matchdayDirectories) {
    const sourcePath = path.join(
      matchDataRoot,
      compactDate,
      `${compactDate}.json`,
    );
    const source = JSON.parse(await readFile(sourcePath, "utf8"));
    assert(
      Array.isArray(source) && source.length > 1,
      `${sourcePath} 数据为空。`,
    );
    const [metadata, ...rawGames] = source;
    assert(Array.isArray(metadata.host), `${sourcePath} 缺少 host 数组。`);
    assert(
      Array.isArray(metadata.streamer),
      `${sourcePath} 缺少 streamer 数组。`,
    );
    assert(
      typeof metadata.statistician === "string",
      `${sourcePath} 缺少 statistician。`,
    );

    const rememberName = (sourceName) => {
      const displayName = canonicalName(sourceName);
      const aliases = observedNames.get(displayName) ?? new Set();
      aliases.add(sourceName.trim());
      observedNames.set(displayName, aliases);
      return displayName;
    };
    const hosts = uniqueNames(metadata.host.map(rememberName));
    const streamers = uniqueNames(metadata.streamer.map(rememberName));
    const statistician = rememberName(metadata.statistician);
    const pointChanges = new Map();
    const participants = new Set();
    let totalDurationSeconds = 0;
    let landlordWins = 0;
    let farmerWins = 0;

    const games = rawGames
      .sort((a, b) => a.fileName.localeCompare(b.fileName))
      .map((rawGame, index) => {
        assert(
          Array.isArray(rawGame.teams) && rawGame.teams.length >= 2,
          `${sourcePath} 第 ${index + 1} 盘队伍数据不完整。`,
        );
        const landlordTeam = rawGame.teams.find((team) => team.team === 1);
        assert(landlordTeam, `${sourcePath} 第 ${index + 1} 盘缺少 force 1。`);
        totalDurationSeconds += rawGame.durationSeconds;
        if (landlordTeam.winner) landlordWins += 1;
        else farmerWins += 1;
        const forces = rawGame.teams.map((rawTeam) => {
          const role = roleForForce(rawTeam.team, rawGame.teams.length);
          return {
            force: rawTeam.team,
            role,
            won: rawTeam.winner,
            players: rawTeam.players.map((rawPlayer) => {
              const displayName = rememberName(rawPlayer.name);
              const disconnected = rawPlayer.exitEvent === "掉线";
              const points = pointsFor(
                rawTeam.team,
                rawTeam.winner,
                disconnected,
              );
              participants.add(displayName);
              addMatchPoints(pointChanges, playerTotals, displayName, points);
              const total =
                playerTotals.get(displayName) ??
                initialPlayerTotal(displayName);
              total.gamesPlayed += 1;
              if (disconnected) {
                total.disconnects += 1;
                total.losses += 1;
              } else if (rawTeam.winner) {
                total.wins += 1;
                if (role === "地主") total.landlordWins += 1;
                if (role === "富农") total.richFarmerWins += 1;
                if (role === "贫农") total.poorFarmerWins += 1;
              } else total.losses += 1;
              if (role === "地主") total.landlordGames += 1;
              if (role === "富农") total.richFarmerGames += 1;
              if (role === "贫农") total.poorFarmerGames += 1;
              if (role === "农民") total.farmerGames += 1;
              playerTotals.set(displayName, total);
              return {
                displayName,
                sourceName: rawPlayer.name,
                race: rawPlayer.race,
                exitEvent: rawPlayer.exitEvent ?? null,
                disconnected,
                points,
              };
            }),
          };
        });
        return {
          number: index + 1,
          sourceReplayFile: rawGame.fileName,
          time: timeLabel(rawGame.fileName),
          duration: rawGame.duration,
          durationSeconds: rawGame.durationSeconds,
          map: mapName(rawGame.fileName),
          forces,
        };
      });

    const staffRoles = new Map();
    const registerStaffRole = (displayName, roleKey) => {
      const roles = staffRoles.get(displayName) ?? [];
      if (!roles.includes(roleKey)) roles.push(roleKey);
      staffRoles.set(displayName, roles);
    };
    hosts.forEach((name) => registerStaffRole(name, "host"));
    streamers.forEach((name) => registerStaffRole(name, "streamer"));
    registerStaffRole(statistician, "statistician");
    for (const [displayName, roleKeys] of staffRoles)
      addWorkPoints(pointChanges, playerTotals, displayName, roleKeys);

    const sortedPointChanges = [...pointChanges.values()].sort(
      (a, b) =>
        b.total - a.total ||
        a.displayName.localeCompare(b.displayName, "zh-CN"),
    );
    const date = isoDate(compactDate);
    const dateValue = new Date(`${date}T12:00:00+08:00`);
    const weekday = new Intl.DateTimeFormat("zh-CN", {
      weekday: "long",
      timeZone: "Asia/Singapore",
    }).format(dateValue);
    const platform = platformForDate(dateValue);
    const commonDay = {
      matchdayNumber: masterMatchDays.length + 1,
      slug: date,
      date,
      dateLabel: new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Singapore",
      }).format(dateValue),
      weekday,
      platform,
      staff: { hosts, streamers, statistician },
      summary: {
        matchCount: games.length,
        participantCount: participants.size,
        landlordWins,
        farmerWins,
      },
      pointChanges: sortedPointChanges,
    };
    masterMatchDays.push({
      ...commonDay,
      sourceFile: path.posix.join(
        "match-data",
        compactDate,
        `${compactDate}.json`,
      ),
      summary: {
        ...commonDay.summary,
        totalDurationSeconds,
        totalDuration: durationLabel(totalDurationSeconds),
      },
      games,
    });
    publicMatchDays.push({
      ...commonDay,
      games: games.map((game) => ({
        number: game.number,
        time: game.time,
        duration: game.duration,
        map: game.map,
        forces: game.forces.map((force) => ({
          force: force.force,
          role: force.role,
          won: force.won,
          players: force.players.map((player) => ({
            displayName: player.displayName,
            disconnected: player.disconnected,
          })),
        })),
      })),
    });
  }

  const firstDate = matchdayDirectories.at(0);
  const lastDate = matchdayDirectories.at(-1);
  const lastGames = publicMatchDays.at(-1).games;
  const standingsAsOf = `${isoDate(lastDate)}T${lastGames.at(-1).time}:00+08:00`;
  const fullStandings = [...playerTotals.values()]
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.displayName.localeCompare(b.displayName, "zh-CN"),
    )
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
      tier: tierForRank(index + 1),
      publiclyListed: index < publicStandingLimit,
    }));
  const publicStandings = {
    schemaVersion: 1,
    season: "dsl2",
    exportId: `dsl2-match-data-${firstDate}-${lastDate}`,
    standingsAsOf,
    publishedAt,
    entries: fullStandings
      .filter((entry) => entry.publiclyListed)
      .map(({ rank, displayName, points, tier }) => ({
        rank,
        displayName,
        points,
        tier,
      })),
  };
  const reports = {
    schemaVersion: 2,
    season: "dsl2",
    sourceRange: `${firstDate}-${lastDate}`,
    matchDays: publicMatchDays.toReversed(),
  };
  const masterData = {
    schemaVersion: 1,
    season: "dsl2",
    timezone: "Asia/Singapore",
    sourceRange: `${firstDate}-${lastDate}`,
    standingsAsOf,
    generatedFrom: {
      matchdayFiles: matchdayDirectories.map((date) =>
        path.posix.join("match-data", date, `${date}.json`),
      ),
      identityFile: "match-data/same_name.csv",
    },
    scoringRules: {
      match: {
        landlordWin: 12,
        landlordLoss: 3,
        farmerWin: 8,
        farmerLoss: 2,
        disconnect: -20,
      },
      work: {
        host: 10,
        streamer: 10,
        statistician: 5,
        perPersonPerMatchdayCap: workPointCap,
      },
      publicStandingLimit,
    },
    identityGroups,
    observedIdentities: [...observedNames.entries()]
      .map(([primaryName, aliases]) => ({
        primaryName,
        observedNames: [...aliases].sort((a, b) => a.localeCompare(b, "zh-CN")),
      }))
      .sort((a, b) => a.primaryName.localeCompare(b.primaryName, "zh-CN")),
    matchDays: masterMatchDays,
    fullStandings,
  };
  return {
    reports: await format(JSON.stringify(reports), { parser: "json" }),
    publicStandings: await format(JSON.stringify(publicStandings), {
      parser: "json",
    }),
    masterData: await format(JSON.stringify(masterData), { parser: "json" }),
    fullStandingsCsv: standingsCsv(fullStandings),
  };
}

async function writeOrCheck(outputPath, output, label) {
  if (checkOnly) {
    const current = await readFile(outputPath, "utf8");
    assert(
      current === output,
      `${label} 与 match-data/same_name.csv 不一致，请运行 pnpm run build:match-reports。`,
    );
    return;
  }
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, "utf8");
}

const { reports, publicStandings, masterData, fullStandingsCsv } =
  await buildData();
await writeOrCheck(reportsOutputPath, reports, "赛报数据");
await writeOrCheck(standingsOutputPath, publicStandings, "公开积分榜");
await writeOrCheck(masterDataOutputPath, masterData, "DSL2 总数据");
await writeOrCheck(fullStandingsOutputPath, fullStandingsCsv, "完整积分榜");
console.log(
  checkOnly
    ? "赛报、公开积分榜、完整积分榜与 DSL2 总数据校验通过。"
    : "已从 match-data 和 same_name.csv 生成全部 DSL2 数据。",
);
