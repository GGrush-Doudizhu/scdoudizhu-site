from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SEASON = "season-2"
IMPORTS_DIR = ROOT / "data-source" / "imports"
CANONICAL_DIR = ROOT / "data-source" / "canonical"
CHINA_TZ = timezone(timedelta(hours=8))
ROLE_VALUES = {"地主", "农民"}
RESULT_VALUES = {"胜", "负", "未知"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Import scdoudizhu_repparser exported zip files.")
    parser.add_argument("zips", nargs="*", help="Zip files exported by scdoudizhu_repparser.exe")
    parser.add_argument("--season", default=DEFAULT_SEASON, help="Season id, default: season-2")
    args = parser.parse_args()

    season_import_dir = IMPORTS_DIR / args.season
    season_import_dir.mkdir(parents=True, exist_ok=True)

    for zip_arg in args.zips:
        zip_path = Path(zip_arg).resolve()
        if not zip_path.exists():
            raise SystemExit(f"Zip not found: {zip_path}")
        staged_dir = season_import_dir / infer_zip_folder(zip_path)
        staged_dir.mkdir(parents=True, exist_ok=True)
        target = staged_dir / zip_path.name
        if zip_path != target.resolve():
            shutil.copy2(zip_path, target)

    zips = sorted(season_import_dir.rglob("*.zip"))
    if not zips:
        raise SystemExit(f"No zip files found under {season_import_dir}")

    matches = []
    seen_keys: set[str] = set()
    for zip_path in zips:
        for source_match in read_project_matches(zip_path):
            if source_match.get("parseStatus") != "解析成功":
                continue
            key = f"{source_match.get('fileName')}|{source_match.get('startTime')}"
            if key in seen_keys:
                continue
            seen_keys.add(key)
            matches.append(normalize_match(source_match, args.season, zip_path))

    matches.sort(key=lambda item: (item["gameStartTime"], item["sourceFileName"]))
    counters: dict[str, int] = {}
    for match in matches:
        compact_day = match["matchday"].replace("-", "")
        counters[compact_day] = counters.get(compact_day, 0) + 1
        match["matchId"] = f'{args.season}-{compact_day}-{counters[compact_day]:03d}'

    out_dir = CANONICAL_DIR / args.season
    out_dir.mkdir(parents=True, exist_ok=True)
    write_json(out_dir / "matches.json", matches)
    print(f"Imported {len(matches)} matches from {len(zips)} zip file(s).")
    print(f"Canonical output: {out_dir / 'matches.json'}")


def infer_zip_folder(zip_path: Path) -> str:
    match = re.search(r"(\d{4})(\d{2})(\d{2})", zip_path.stem)
    if match:
        return "".join(match.groups())
    match = re.search(r"(\d{2})(\d{2})", zip_path.stem)
    if match:
        year = datetime.now().year
        return f"{year}{match.group(1)}{match.group(2)}"
    return "manual-imports"


def read_project_matches(zip_path: Path) -> list[dict[str, Any]]:
    with zipfile.ZipFile(zip_path) as zf:
        json_names = [name for name in zf.namelist() if name.lower().endswith(".json")]
        if not json_names:
            raise ValueError(f"No project json found in {zip_path}")
        project_name = "项目.json" if "项目.json" in json_names else json_names[0]
        with zf.open(project_name) as file:
            project = json.loads(file.read().decode("utf-8-sig"))
    matches = project.get("matches")
    if not isinstance(matches, list):
        raise ValueError(f"Project json has no matches array: {zip_path}")
    return matches


def normalize_match(source: dict[str, Any], season: str, zip_path: Path) -> dict[str, Any]:
    start = parse_start_time(str(source.get("startTime") or source.get("dateText") or ""))
    duration_seconds = float(source.get("durationSeconds") or 0)
    end = start + timedelta(seconds=duration_seconds)
    winner = normalize_role(source.get("finalWinnerRole") or source.get("autoWinnerRole"))
    players = [normalize_player(player, winner) for player in source.get("players", []) if not player.get("observer")]
    players = [player for player in players if player["role"] in ROLE_VALUES]
    return {
        "matchId": temporary_match_id(source),
        "season": season,
        "matchday": start.date().isoformat(),
        "sourceFileName": str(source.get("fileName") or source.get("filePath") or ""),
        "sourceZip": zip_path.name,
        "mapName": clean_text(str(source.get("mapName") or "")),
        "mapVersion": str(source.get("mapVersion") or ""),
        "gameStartTime": start.isoformat(),
        "gameEndTime": end.isoformat(),
        "durationSeconds": round(duration_seconds, 3),
        "durationText": duration_text(duration_seconds),
        "winner": winner,
        "confirmed": bool(source.get("confirmed")),
        "excluded": bool(source.get("excluded") or source.get("discarded")),
        "publicNote": "",
        "internalNote": str(source.get("note") or ""),
        "host": str(source.get("host") or ""),
        "repSaver": str(source.get("repSaver") or ""),
        "players": players,
    }


def normalize_player(source: dict[str, Any], winner: str) -> dict[str, Any]:
    role = normalize_role(source.get("finalRole") or source.get("autoRole"))
    result = normalize_result(source.get("finalResult") or source.get("autoResult"))
    if result == "未知" and role in ROLE_VALUES and winner in ROLE_VALUES:
        result = "胜" if role == winner else "负"
    return {
        "name": clean_text(str(source.get("name") or "未知选手")),
        "role": role,
        "result": result,
        "race": short_race(str(source.get("race") or "")),
        "apm": int(source.get("apm") or 0),
        "eapm": int(source.get("eapm") or 0),
        "cmdCount": int(source.get("cmdCount") or 0),
        "effectiveCmdCount": int(source.get("effectiveCmdCount") or 0),
    }


def normalize_role(value: Any) -> str:
    text = str(value or "未知")
    return text if text in ROLE_VALUES else "未知"


def normalize_result(value: Any) -> str:
    text = str(value or "未知")
    return text if text in RESULT_VALUES else "未知"


def short_race(value: str) -> str:
    table = {
        "Protoss": "P",
        "Terran": "T",
        "Zerg": "Z",
        "P": "P",
        "T": "T",
        "Z": "Z",
    }
    return table.get(value, value)


def parse_start_time(value: str) -> datetime:
    value = value.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(value[:19], fmt).replace(tzinfo=CHINA_TZ)
        except ValueError:
            pass
    if not value:
        return datetime.now(CHINA_TZ)
    raise ValueError(f"Unsupported startTime: {value}")


def duration_text(seconds: float) -> str:
    total = max(0, int(seconds + 0.5))
    minutes, remain = divmod(total, 60)
    return f"{minutes}:{remain:02d}"


def clean_text(value: str) -> str:
    return re.sub(r"[\x00-\x1f]", "", value).strip()


def temporary_match_id(source: dict[str, Any]) -> str:
    raw = f"{source.get('id')}|{source.get('fileName')}|{source.get('startTime')}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
