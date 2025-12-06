#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# ///
"""
One-off migration helper to move EIP JSON files from the deprecated `status`
field to the `statusHistory` array format.

Old format: { "forkName": "...", "status": "Included" }
New format: { "forkName": "...", "statusHistory": [{ "status": "Included" }] }
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

ROOT = Path(__file__).resolve().parent
EIPS_DIR = ROOT / "src" / "data" / "eips"


def migrate_eip_file(path: Path) -> bool:
    """Return True if the file was modified."""
    try:
        data: Dict[str, Any] = json.loads(path.read_text())
    except Exception as exc:  # noqa: BLE001
        print(f"Error reading {path.name}: {exc}")
        return False

    modified = False
    fork_relationships = data.get("forkRelationships")

    if isinstance(fork_relationships, list):
        migrated: List[Dict[str, Any]] = []
        for fork in fork_relationships:
            if not isinstance(fork, dict):
                migrated.append(fork)
                continue

            status_history = fork.get("statusHistory") or []
            new_fork = {**fork, "statusHistory": status_history}

            if isinstance(fork.get("status"), str):
                status_value = fork["status"]
                if status_value and not status_history:
                    new_fork["statusHistory"] = [{"status": status_value}]

                new_fork.pop("status", None)
                modified = True

            migrated.append(new_fork)

        data["forkRelationships"] = migrated

    if modified:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

    return modified


def main() -> None:
    if not EIPS_DIR.exists():
        raise SystemExit(f"Missing EIP data directory: {EIPS_DIR}")

    files = sorted(p for p in EIPS_DIR.glob("*.json") if p.is_file())
    print(f"Found {len(files)} EIP JSON files\n")

    migrated = 0
    for file_path in files:
        if migrate_eip_file(file_path):
            migrated += 1
            print(f"✓ Migrated: {file_path.name}")

    print("\n--- Migration Summary ---")
    print(f"Total files: {len(files)}")
    print(f"Migrated: {migrated}")
    print(f"Unchanged: {len(files) - migrated}")


if __name__ == "__main__":
    main()
