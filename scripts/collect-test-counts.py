#!/usr/bin/env python3
"""
Collect per-EIP test counts (including parametrized) from ethereum/execution-specs.

Requires a local clone of execution-specs with `uv sync` already run.

Usage:
    python scripts/collect-test-counts.py <execution-specs-path> <output-json-path>

Example:
    python scripts/collect-test-counts.py ./execution-specs src/data/execution-spec-test-counts.json
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = "ethereum/execution-specs"
FORK_NAME = "amsterdam"


def git(repo_path: str, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", "-C", repo_path, *args],
        capture_output=True,
        text=True,
        timeout=30,
    )


def list_feature_branches(repo_path: str) -> list[str]:
    """List remote branches matching eips/<fork>/eip-*."""
    result = git(repo_path, "branch", "-r", "--list", f"origin/eips/{FORK_NAME}/eip-*")
    branches = []
    for line in result.stdout.strip().splitlines():
        branch = line.strip().removeprefix("origin/")
        if branch:
            branches.append(branch)
    return sorted(branches)


def list_shared_branches(repo_path: str) -> list[str]:
    """Discover shared devnet/fork branches that have amsterdam tests.

    Matches: forks/amsterdam, devnets/bal/*
    Returns the highest-numbered devnet branch per series (e.g., devnets/bal/7 not /6).
    """
    result = git(repo_path, "branch", "-r")
    if result.returncode != 0:
        return []

    # Collect all candidate branches
    fork_branches = []
    devnet_series: dict[str, list[tuple[int, str]]] = {}

    for line in result.stdout.strip().splitlines():
        branch = line.strip().removeprefix("origin/")
        if branch == f"forks/{FORK_NAME}":
            fork_branches.append(branch)
            continue
        match = re.match(r"(devnets/(?:bal)/?)(\d+)$", branch)
        if match:
            series = match.group(1)
            num = int(match.group(2))
            devnet_series.setdefault(series, []).append((num, branch))

    # Keep only the latest branch per devnet series
    for series, entries in devnet_series.items():
        entries.sort(reverse=True)
        fork_branches.append(entries[0][1])

    return fork_branches


def checkout(repo_path: str, branch: str) -> bool:
    # Reset any changes from uv sync or other operations before switching
    git(repo_path, "checkout", "--", ".")
    git(repo_path, "clean", "-fd", "--quiet", "-e", ".venv", "-e", "uv.lock")
    # Use origin/ prefix for remote branches in a fresh clone
    ref = branch if branch.startswith("origin/") else f"origin/{branch}"
    result = git(repo_path, "checkout", "--detach", ref)
    if result.returncode != 0:
        print(f"  WARNING: failed to checkout {ref}: {result.stderr.strip()}")
        return False
    # Re-sync deps in case pyproject.toml differs on this branch
    sync = subprocess.run(
        ["uv", "sync", "--project", repo_path],
        capture_output=True, text=True, timeout=120,
    )
    if sync.returncode != 0:
        print(f"  WARNING: uv sync failed on {branch}: {sync.stderr[:200]}")
    return True


def find_eip_dirs(repo_path: str) -> dict[int, str]:
    """Find EIP test directories under tests/<fork>/."""
    test_base = Path(repo_path) / "tests" / FORK_NAME
    if not test_base.is_dir():
        return {}

    eip_dirs = {}
    for entry in sorted(test_base.iterdir()):
        if not entry.is_dir():
            continue
        match = re.match(r"eip(\d+)_(.+)", entry.name)
        if match:
            eip_num = int(match.group(1))
            eip_dirs[eip_num] = entry.name
    return eip_dirs


def count_test_files(repo_path: str, dir_name: str) -> int:
    """Count test_*.py files in an EIP directory."""
    eip_path = Path(repo_path) / "tests" / FORK_NAME / dir_name
    return len(list(eip_path.glob("test_*.py")))


def count_test_functions(repo_path: str, dir_name: str) -> int:
    """Count def test_ definitions (non-parametrized count)."""
    eip_path = Path(repo_path) / "tests" / FORK_NAME / dir_name
    count = 0
    for py_file in eip_path.glob("test_*.py"):
        content = py_file.read_text(errors="replace")
        count += len(re.findall(r"^def test_", content, re.MULTILINE))
    return count


def collect_test_cases(repo_path: str, dir_name: str) -> int | None:
    """Run `fill --collect-only -m blockchain_test` to get distinct test count.

    Uses the `fill` command (not plain pytest) so that custom markers like
    blockchain_test are registered.  Only blockchain_test variants are counted
    because all state tests also generate blockchain tests, so this avoids
    double-counting.
    """
    test_path = str(Path(repo_path) / "tests" / FORK_NAME / dir_name)

    try:
        result = subprocess.run(
            [
                "uv", "run", "--project", repo_path,
                "fill", "--collect-only",
                "-m", "blockchain_test",
                f"--fork={FORK_NAME.capitalize()}",
                test_path,
            ],
            capture_output=True,
            text=True,
            timeout=120,
            cwd=repo_path,
        )
    except subprocess.TimeoutExpired:
        print(f"  WARNING: pytest collection timed out for {dir_name}")
        return None

    if result.returncode not in (0, 5):  # 5 = no tests collected
        # Try to extract count from output even on error
        pass

    # Parse the summary line: "N tests collected" or "N/M tests collected (X deselected)"
    summary_match = re.search(r"(\d+)(?:/\d+)? tests? collected", result.stdout)
    if summary_match:
        return int(summary_match.group(1))

    # Fallback: count non-empty non-summary lines
    lines = [
        line for line in result.stdout.strip().splitlines()
        if line.strip()
        and not line.startswith("=")
        and "warnings summary" not in line.lower()
        and "warning" not in line.lower()
        and "error" not in line.lower()
        and "no tests" not in line.lower()
    ]
    if lines:
        return len(lines)

    if result.stderr:
        print(f"  WARNING: pytest stderr for {dir_name}: {result.stderr[:200]}")

    return None


def process_branch(repo_path: str, branch: str, target_eip: int | None = None) -> dict:
    """Process a branch and return {eip_number: data_dict}."""
    results = {}
    if not checkout(repo_path, branch):
        return results

    eip_dirs = find_eip_dirs(repo_path)
    if not eip_dirs:
        return results

    for eip_num, dir_name in eip_dirs.items():
        # For feature branches, only count the matching EIP
        if target_eip is not None and eip_num != target_eip:
            continue

        print(f"    Collecting EIP-{eip_num} ({dir_name})...")
        test_files = count_test_files(repo_path, dir_name)
        test_functions = count_test_functions(repo_path, dir_name)
        test_cases = collect_test_cases(repo_path, dir_name)

        if test_cases is not None:
            print(f"      {test_files} files, {test_functions} functions, {test_cases} test cases")
        else:
            print(f"      {test_files} files, {test_functions} functions (collection failed)")

        results[eip_num] = {
            "testFiles": test_files,
            "testFunctions": test_functions,
            "testCases": test_cases if test_cases is not None else test_functions,
            "branch": branch.removeprefix("origin/"),
            "directoryName": dir_name,
        }

    return results


def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <execution-specs-path> <output-json-path>")
        sys.exit(1)

    repo_path = os.path.abspath(sys.argv[1])
    output_path = os.path.abspath(sys.argv[2])

    if not Path(repo_path).is_dir():
        print(f"ERROR: {repo_path} is not a directory")
        sys.exit(1)

    print(f"Collecting test counts from {repo_path}...")

    # Fetch all remote branches
    git(repo_path, "fetch", "--all")

    # Best result per EIP (keep the one with highest testCases)
    best: dict[int, dict] = {}

    def update_best(eip_num: int, data: dict):
        existing = best.get(eip_num)
        if not existing or data["testCases"] > existing["testCases"]:
            best[eip_num] = data

    # 1. Check EIP feature branches
    feature_branches = list_feature_branches(repo_path)
    print(f"Found {len(feature_branches)} feature branches")

    for branch in feature_branches:
        eip_match = re.search(r"eip-(\d+)$", branch)
        if not eip_match:
            continue
        target_eip = int(eip_match.group(1))

        print(f"  Branch: {branch}")
        for eip_num, data in process_branch(repo_path, branch, target_eip).items():
            update_best(eip_num, data)

    # 2. Check shared branches (auto-discovered)
    shared_branches = list_shared_branches(repo_path)
    print(f"Found {len(shared_branches)} shared branches: {shared_branches}")

    for branch in shared_branches:
        print(f"  Shared branch: {branch}")
        for eip_num, data in process_branch(repo_path, branch).items():
            update_best(eip_num, data)

    # Build output
    eips = {}
    for eip_num in sorted(best.keys()):
        eips[str(eip_num)] = best[eip_num]

    output = {
        "repo": REPO,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "eips": eips,
    }

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    Path(output_path).write_text(json.dumps(output, indent=2) + "\n")
    print(f"\nWrote {output_path}")
    print(f"Total: {len(eips)} EIPs with tests")


if __name__ == "__main__":
    main()
