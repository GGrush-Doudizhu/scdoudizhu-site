from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SEASON = "season-2"
CANONICAL_DIR = ROOT / "data-source" / "canonical"
ROLE_VALUES = {"地主", "农民"}
RESULT_VALUES = {"胜", "负", "未知"}
FORBIDDEN_KEYS = {"slotId", "slotID", "playerId", "playerID", "originalTeam", "color", "leaveFrame", "leaveSecond", "leaveReason"}


def main() -> None:
    path = CANONICAL_DIR / DEFAULT_SEASON / "matches.json"
    if not path.exists():
        print(f"No canonical data yet: {path}")
        return

    matches = json.loads(path.read_text(encoding="utf-8"))
    errors: list[str] = []
    seen_ids: set[str] = set()

    for match in matches:
        match_id = match.get("matchId", "<missing>")
        if match_id in seen_ids:
            errors.append(f"Duplicate matchId: {match_id}")
        seen_ids.add(match_id)
        ensure_no_forbidden_keys(match, f"match {match_id}", errors)

        if not match.get("excluded") and not match.get("confirmed"):
            errors.append(f"Match is not confirmed: {match_id}")
        if match.get("winner") not in ROLE_VALUES and not match.get("excluded"):
            errors.append(f"Winner must be 地主 or 农民: {match_id}")

        players = match.get("players", [])
        landlord_count = 0
        farmer_count = 0
        for player in players:
            ensure_no_forbidden_keys(player, f"player in {match_id}", errors)
            role = player.get("role")
            result = player.get("result")
            if role not in ROLE_VALUES:
                errors.append(f"Invalid player role in {match_id}: {role}")
            if result not in RESULT_VALUES:
                errors.append(f"Invalid player result in {match_id}: {result}")
            landlord_count += 1 if role == "地主" else 0
            farmer_count += 1 if role == "农民" else 0
        if not match.get("excluded") and (landlord_count != 2 or farmer_count != 6):
            errors.append(f"2v6 role count mismatch in {match_id}: 地主={landlord_count}, 农民={farmer_count}")

    if errors:
        print("Data validation failed:")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    valid_count = sum(1 for match in matches if match.get("confirmed") and not match.get("excluded"))
    print(f"Data validation passed: {len(matches)} total matches, {valid_count} valid matches.")


def ensure_no_forbidden_keys(value: Any, label: str, errors: list[str]) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if key in FORBIDDEN_KEYS:
                errors.append(f"Forbidden field {key} found in {label}")
            ensure_no_forbidden_keys(child, label, errors)
    elif isinstance(value, list):
        for child in value:
            ensure_no_forbidden_keys(child, label, errors)


if __name__ == "__main__":
    main()
