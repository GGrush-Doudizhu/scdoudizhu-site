import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface RankingRow {
  playerName: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  averageApm: number;
  landlordWinRate?: number | null;
  farmerWinRate?: number | null;
}

interface Rankings {
  overall: RankingRow[];
  landlord: RankingRow[];
  farmer: RankingRow[];
}

interface Manifest {
  currentSeason: string;
}

type SortKey = "playerName" | "wins" | "losses" | "games" | "winRate" | "averageApm";
type SortDir = "asc" | "desc";

const tabs = [
  ["overall", "总榜"],
  ["landlord", "地主榜"],
  ["farmer", "农民榜"]
] as const;

const sortLabels: Record<SortKey, string> = {
  playerName: "选手名称",
  wins: "胜场",
  losses: "负场",
  games: "总场",
  winRate: "胜率",
  averageApm: "平均APM"
};

export default function RankingTable() {
  const [rankings, setRankings] = useState<Rankings | null>(null);
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("overall");
  const [sortKey, setSortKey] = useState<SortKey>("winRate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const manifest = (await fetch("/data/manifest.json").then((res) => res.json())) as Manifest;
        const loaded = (await fetch(`/data/seasons/${manifest.currentSeason}/rankings.json`).then((res) => res.json())) as Rankings;
        setRankings(loaded);
      } catch (err) {
        setError(err instanceof Error ? err.message : "排行榜加载失败");
      }
    }
    void load();
  }, []);

  const rows = useMemo(() => {
    const base = [...(rankings?.[tab] || [])];
    const q = query.trim().toLowerCase();
    return base.sort((a, b) => compareRows(a, b, sortKey, sortDir)).map((row) => ({
      ...row,
      highlighted: q.length > 0 && row.playerName.toLowerCase().includes(q)
    }));
  }, [query, rankings, sortDir, sortKey, tab]);

  useEffect(() => {
    if (!query.trim()) return;
    window.setTimeout(() => {
      document.querySelector(".rank-shell .highlight-row")?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 50);
  }, [query, rows]);

  if (error) return <section className="rank-shell">排行榜加载失败：{error}</section>;
  if (!rankings) return <section className="rank-shell">正在加载排行榜...</section>;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "playerName" ? "asc" : "desc");
    }
  }

  return (
    <section className="rank-shell">
      <div className="toolbar ranking-tools">
        {tabs.map(([key, label]) => (
          <button key={key} className={tab === key ? "primary" : ""} type="button" onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
        <label className="rank-search">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索选手并高亮" />
        </label>
      </div>

      <div className="sort-row">
        {Object.entries(sortLabels).map(([key, label]) => (
          <button key={key} type="button" className={sortKey === key ? "primary" : ""} onClick={() => toggleSort(key as SortKey)}>
            {label}{sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>排名</th>
              <th>选手</th>
              <th>胜场</th>
              <th>负场</th>
              <th>总场</th>
              <th>胜率</th>
              <th>平均APM</th>
              <th>角色胜率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.playerName} className={row.highlighted ? "highlight-row" : ""}>
                <td>{index + 1}</td>
                <td>{row.playerName}</td>
                <td>{row.wins}</td>
                <td>{row.losses}</td>
                <td>{row.games}</td>
                <td>{row.winRate.toFixed(1)}%</td>
                <td>{row.averageApm}</td>
                <td>地主 {formatRate(row.landlordWinRate)} / 农民 {formatRate(row.farmerWinRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function compareRows(a: RankingRow, b: RankingRow, key: SortKey, dir: SortDir) {
  const factor = dir === "asc" ? 1 : -1;
  if (key === "playerName") {
    return a.playerName.localeCompare(b.playerName, "zh-CN") * factor;
  }
  return ((a[key] as number) - (b[key] as number)) * factor;
}

function formatRate(value: number | null | undefined) {
  return value == null ? "无" : `${value.toFixed(1)}%`;
}
