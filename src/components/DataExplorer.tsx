import { Download, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Role = "地主" | "农民" | "未知";
type Result = "胜" | "负" | "未知";

interface PlayerRecord {
  name: string;
  role: Role;
  result: Result;
  race: string;
  apm: number;
}

interface MatchRecord {
  matchId: string;
  season: string;
  matchday: string;
  mapName: string;
  mapVersion: string;
  gameStartTime: string;
  gameEndTime: string;
  durationSeconds: number;
  durationText: string;
  winner: Role;
  confirmed: boolean;
  excluded: boolean;
  publicNote: string;
  host: string;
  repSaver: string;
  players: PlayerRecord[];
}

interface Manifest {
  currentSeason: string;
}

type PlayerRow = PlayerRecord & {
  matchId: string;
  matchday: string;
  gameStartTime: string;
  durationText: string;
  winner: Role;
  publicNote: string;
};

const roleOptions = ["全部", "地主", "农民"] as const;
const resultOptions = ["全部", "胜", "负"] as const;

export default function DataExplorer() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<(typeof roleOptions)[number]>("全部");
  const [result, setResult] = useState<(typeof resultOptions)[number]>("全部");
  const [matchday, setMatchday] = useState("全部");
  const [winner, setWinner] = useState("全部");
  const [view, setView] = useState<"players" | "matches">("players");
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");

  useEffect(() => {
    async function load() {
      try {
        const manifest = (await fetch("/data/manifest.json").then((res) => res.json())) as Manifest;
        const loadedMatches = (await fetch(`/data/seasons/${manifest.currentSeason}/matches.json`).then((res) => res.json())) as MatchRecord[];
        setMatches(loadedMatches);
      } catch (err) {
        setError(err instanceof Error ? err.message : "数据加载失败");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const matchdays = useMemo(() => ["全部", ...Array.from(new Set(matches.map((match) => match.matchday))).sort()], [matches]);

  const playerRows = useMemo<PlayerRow[]>(() => {
    const q = query.trim().toLowerCase();
    return matches
      .filter((match) => match.confirmed && !match.excluded)
      .filter((match) => matchday === "全部" || match.matchday === matchday)
      .filter((match) => winner === "全部" || match.winner === winner)
      .flatMap((match) =>
        match.players.map((player) => ({
          ...player,
          matchId: match.matchId,
          matchday: match.matchday,
          gameStartTime: match.gameStartTime,
          durationText: match.durationText,
          winner: match.winner,
          publicNote: match.publicNote
        }))
      )
      .filter((row) => role === "全部" || row.role === role)
      .filter((row) => result === "全部" || row.result === result)
      .filter((row) => !q || row.name.toLowerCase().includes(q) || row.matchId.toLowerCase().includes(q));
  }, [matches, matchday, query, result, role, winner]);

  const filteredMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matches
      .filter((match) => match.confirmed && !match.excluded)
      .filter((match) => matchday === "全部" || match.matchday === matchday)
      .filter((match) => winner === "全部" || match.winner === winner)
      .filter((match) => {
        if (!q) return true;
        return match.matchId.toLowerCase().includes(q) || match.players.some((player) => player.name.toLowerCase().includes(q));
      })
      .filter((match) => {
        if (role === "全部" && result === "全部") return true;
        return match.players.some((player) => (role === "全部" || player.role === role) && (result === "全部" || player.result === result));
      });
  }, [matches, matchday, query, result, role, winner]);

  const playerNames = useMemo(() => Array.from(new Set(playerRows.map((row) => row.name))).sort(), [playerRows]);
  const detailName = selectedPlayer || playerNames[0] || "";
  const detail = useMemo(() => buildPlayerDetail(detailName, playerRows), [detailName, playerRows]);

  const stats = useMemo(() => {
    const players = new Set(playerRows.map((row) => row.name));
    const wins = playerRows.filter((row) => row.result === "胜").length;
    return {
      matchCount: filteredMatches.length,
      rowCount: playerRows.length,
      playerCount: players.size,
      winRate: playerRows.length ? ((wins / playerRows.length) * 100).toFixed(1) : "0.0"
    };
  }, [filteredMatches.length, playerRows]);

  function exportCsv() {
    const header = view === "players"
      ? ["比赛ID", "日期", "开始时间", "选手", "种族", "角色", "胜负", "胜方"]
      : ["比赛ID", "日期", "开始时间", "持续时间", "胜方", "地主", "农民", "备注"];
    const rows = view === "players"
      ? playerRows.map((row) => [row.matchId, row.matchday, row.gameStartTime, row.name, row.race, row.role, row.result, row.winner])
      : filteredMatches.map((match) => [
        match.matchId,
        match.matchday,
        match.gameStartTime,
        match.durationText,
        match.winner,
        namesByRole(match, "地主"),
        namesByRole(match, "农民"),
        match.publicNote || ""
      ]);
    const csv = [header, ...rows].map((line) => line.map(csvCell).join(",")).join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = view === "players" ? "星际斗地主玩家筛选结果.csv" : "星际斗地主对局筛选结果.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <section className="data-shell">正在加载比赛数据...</section>;
  if (error) return <section className="data-shell">数据加载失败：{error}</section>;

  return (
    <section className="data-shell">
      <div className="filter-grid">
        <div className="filter-field">
          <label htmlFor="query">搜索</label>
          <input id="query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="选手名或比赛ID" />
        </div>
        <SelectField label="比赛日" value={matchday} options={matchdays} onChange={setMatchday} />
        <SelectField label="角色" value={role} options={roleOptions} onChange={(value) => setRole(value as (typeof roleOptions)[number])} />
        <SelectField label="胜负" value={result} options={resultOptions} onChange={(value) => setResult(value as (typeof resultOptions)[number])} />
        <SelectField label="胜方" value={winner} options={["全部", "地主", "农民"]} onChange={setWinner} />
      </div>

      <div className="stat-row">
        <div className="stat-box"><b>{stats.matchCount}</b><span>筛选对局</span></div>
        <div className="stat-box"><b>{stats.playerCount}</b><span>涉及选手</span></div>
        <div className="stat-box"><b>{stats.rowCount}</b><span>玩家记录</span></div>
        <div className="stat-box"><b>{stats.winRate}%</b><span>行记录胜率</span></div>
      </div>

      <div className="toolbar data-tabs">
        <button className={view === "players" ? "primary" : ""} type="button" onClick={() => setView("players")}>按玩家查看</button>
        <button className={view === "matches" ? "primary" : ""} type="button" onClick={() => setView("matches")}>按对局查看</button>
        <button type="button" onClick={exportCsv}><Download size={17} />导出当前筛选</button>
        <span><Search size={15} /> {view === "players" ? `${playerRows.length} 条玩家记录` : `${filteredMatches.length} 局`}</span>
      </div>

      {view === "players" ? <PlayerTable rows={playerRows} onSelect={setSelectedPlayer} selected={detailName} /> : <MatchTable matches={filteredMatches} />}

      {detail ? (
        <aside className="player-detail">
          <div>
            <span className="pill">选手详情</span>
            <h2>{detail.name}</h2>
          </div>
          <div className="detail-grid">
            <DetailItem label="总场次" value={String(detail.games)} />
            <DetailItem label="胜率" value={`${detail.winRate.toFixed(1)}%`} />
            <DetailItem label="地主胜率" value={formatOptionalRate(detail.roleRates["地主"])} />
            <DetailItem label="农民胜率" value={formatOptionalRate(detail.roleRates["农民"])} />
          </div>
          <div className="race-rates">
            {Object.entries(detail.raceRates).map(([race, rate]) => (
              <span key={race}>{race}: {formatOptionalRate(rate)}</span>
            ))}
          </div>
        </aside>
      ) : null}
    </section>
  );
}

function PlayerTable({ rows, selected, onSelect }: { rows: PlayerRow[]; selected: string; onSelect: (name: string) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>比赛日</th>
            <th>选手</th>
            <th>种族</th>
            <th>角色</th>
            <th>胜负</th>
            <th>胜方</th>
            <th>持续时间</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.matchId}-${row.name}-${row.role}`} className={row.name === selected ? "highlight-row" : ""} onClick={() => onSelect(row.name)}>
              <td>{row.matchday}</td>
              <td>{row.name}</td>
              <td>{row.race}</td>
              <td><RoleBadge role={row.role} /></td>
              <td className={row.result === "胜" ? "win" : "lose"}>{row.result}</td>
              <td>{row.winner}</td>
              <td>{row.durationText}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchTable({ matches }: { matches: MatchRecord[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>比赛日</th>
            <th>开始时间</th>
            <th>持续时间</th>
            <th>胜方</th>
            <th>地主</th>
            <th>农民</th>
            <th>种族</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => (
            <tr key={match.matchId}>
              <td>{match.matchday}</td>
              <td>{formatTime(match.gameStartTime)}</td>
              <td>{match.durationText}</td>
              <td>{match.winner}</td>
              <td>{namesByRole(match, "地主")}</td>
              <td>{namesByRole(match, "农民")}</td>
              <td>{raceSummary(match)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  return (
    <div className="filter-field">
      <label>{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  return <span className={`role ${role === "地主" ? "landlord" : "farmer"}`}>{role}</span>;
}

function namesByRole(match: MatchRecord, role: Role) {
  return match.players.filter((player) => player.role === role).map((player) => player.name).join("、");
}

function raceSummary(match: MatchRecord) {
  return match.players.map((player) => `${player.name}:${player.race}`).join("、");
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function buildPlayerDetail(name: string, rows: PlayerRow[]) {
  if (!name) return null;
  const items = rows.filter((row) => row.name === name);
  if (!items.length) return null;
  const wins = items.filter((row) => row.result === "胜").length;
  return {
    name,
    games: items.length,
    winRate: wins / items.length * 100,
    roleRates: {
      "地主": rate(items.filter((row) => row.role === "地主")),
      "农民": rate(items.filter((row) => row.role === "农民"))
    },
    raceRates: Object.fromEntries(Array.from(new Set(items.map((row) => row.race))).sort().map((raceName) => [raceName, rate(items.filter((row) => row.race === raceName))]))
  };
}

function rate(rows: PlayerRow[]) {
  if (!rows.length) return null;
  return rows.filter((row) => row.result === "胜").length / rows.length * 100;
}

function formatOptionalRate(value: number | null) {
  return value == null ? "无数据" : `${value.toFixed(1)}%`;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div className="stat-box"><b>{value}</b><span>{label}</span></div>;
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}
