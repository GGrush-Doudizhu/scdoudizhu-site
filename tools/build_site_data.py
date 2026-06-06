from __future__ import annotations

import csv
import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SEASON = "season-2"
CANONICAL_DIR = ROOT / "data-source" / "canonical"
PUBLIC_DATA_DIR = ROOT / "public" / "data"
ROLE_VALUES = {"地主", "农民"}


def main() -> None:
    season = DEFAULT_SEASON
    canonical_path = CANONICAL_DIR / season / "matches.json"
    if not canonical_path.exists():
        raise SystemExit(f"Canonical data not found: {canonical_path}")

    matches = json.loads(canonical_path.read_text(encoding="utf-8"))
    public_matches = [public_match(match) for match in matches]
    player_rows = build_player_rows(public_matches)
    players = build_players(player_rows, player_rows)
    rankings = {
        "overall": sort_ranking(players),
        "landlord": sort_ranking(build_players([row for row in player_rows if row["role"] == "地主"], player_rows)),
        "farmer": sort_ranking(build_players([row for row in player_rows if row["role"] == "农民"], player_rows)),
    }
    matchdays = build_matchdays(public_matches)

    season_dir = PUBLIC_DATA_DIR / "seasons" / season
    write_json(PUBLIC_DATA_DIR / "manifest.json", {
        "schemaVersion": 1,
        "currentSeason": season,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "roles": ["地主", "农民"],
    })
    write_json(season_dir / "matches.json", public_matches)
    write_json(season_dir / "player_rows.json", player_rows)
    write_json(season_dir / "players.json", players)
    write_json(season_dir / "rankings.json", rankings)
    write_json(season_dir / "matchdays.json", matchdays)
    write_player_rows_csv(season_dir / "player_rows.csv", player_rows)
    print(f"Built public data for {len(public_matches)} matches and {len(player_rows)} player rows.")


def public_match(match: dict[str, Any]) -> dict[str, Any]:
    allowed = {
        "matchId",
        "season",
        "matchday",
        "mapName",
        "mapVersion",
        "gameStartTime",
        "gameEndTime",
        "durationSeconds",
        "durationText",
        "winner",
        "confirmed",
        "excluded",
        "publicNote",
        "host",
        "repSaver",
        "players",
    }
    result = {key: match.get(key) for key in allowed if key in match}
    result["players"] = [public_player(player) for player in match.get("players", [])]
    return result


def public_player(player: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": player.get("name", ""),
        "role": player.get("role", "未知"),
        "result": player.get("result", "未知"),
        "race": player.get("race", ""),
        "apm": int(player.get("apm") or 0),
    }


def build_player_rows(matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = []
    for match in matches:
        if match.get("excluded") or not match.get("confirmed"):
            continue
        for player in match.get("players", []):
            rows.append({
                "matchId": match["matchId"],
                "season": match["season"],
                "matchday": match["matchday"],
                "gameStartTime": match["gameStartTime"],
                "playerName": player["name"],
                "role": player["role"],
                "result": player["result"],
                "winner": match["winner"],
                "race": player["race"],
                "apm": player["apm"],
            })
    return rows


def build_players(rows: list[dict[str, Any]], all_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        if row["role"] in ROLE_VALUES:
            grouped[row["playerName"]].append(row)
    all_grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in all_rows:
        if row["role"] in ROLE_VALUES:
            all_grouped[row["playerName"]].append(row)
    players = []
    for name, items in grouped.items():
        games = len(items)
        wins = sum(1 for row in items if row["result"] == "胜")
        losses = sum(1 for row in items if row["result"] == "负")
        all_items = all_grouped.get(name, items)
        players.append({
            "playerName": name,
            "games": games,
            "wins": wins,
            "losses": losses,
            "winRate": round(wins / games * 100, 4) if games else 0,
            "averageApm": round(sum(row["apm"] for row in items) / games) if games else 0,
            "landlordWinRate": role_win_rate(all_items, "地主"),
            "farmerWinRate": role_win_rate(all_items, "农民"),
            "raceWinRates": race_win_rates(all_items),
        })
    return players


def role_win_rate(rows: list[dict[str, Any]], role: str) -> float | None:
    items = [row for row in rows if row["role"] == role]
    if not items:
        return None
    wins = sum(1 for row in items if row["result"] == "胜")
    return round(wins / len(items) * 100, 4)


def race_win_rates(rows: list[dict[str, Any]]) -> dict[str, dict[str, float | int]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        race = row.get("race") or "未知"
        grouped[race].append(row)
    result: dict[str, dict[str, float | int]] = {}
    for race, items in grouped.items():
        wins = sum(1 for row in items if row["result"] == "胜")
        result[race] = {
            "games": len(items),
            "wins": wins,
            "winRate": round(wins / len(items) * 100, 4) if items else 0,
        }
    return result


def sort_ranking(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(rows, key=lambda row: (row["winRate"], row["wins"], row["games"]), reverse=True)


def build_matchdays(matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for match in matches:
        grouped[match["matchday"]].append(match)
    result = []
    for day, items in sorted(grouped.items()):
        valid = [item for item in items if item.get("confirmed") and not item.get("excluded")]
        result.append({
            "matchday": day,
            "totalMatches": len(items),
            "validMatches": len(valid),
            "landlordWins": sum(1 for item in valid if item.get("winner") == "地主"),
            "farmerWins": sum(1 for item in valid if item.get("winner") == "农民"),
        })
    return result


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def write_player_rows_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    headers = ["matchId", "season", "matchday", "gameStartTime", "playerName", "role", "result", "winner", "race", "apm"]
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


if __name__ == "__main__":
    main()
