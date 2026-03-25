"""
Colorado Parks & Wildlife draw statistics scraper.

CPW publishes annual draw statistics as PDFs and sometimes Excel files at:
  https://cpw.state.co.us/learn/Pages/SOPApplicationStatistics.aspx

This scraper:
  1. Fetches the statistics page to discover available files
  2. Downloads PDF/Excel draw stat files for each year
  3. Parses the data into the standard import JSON format
  4. Optionally posts directly to the admin import endpoint

Usage:
    python scrapers/colorado.py --year 2023 --output seed_data/co_2023.json
    python scrapers/colorado.py --year 2023 --import-url http://localhost:8000
"""
import argparse
import json
import os
import re
import sys
import requests
from typing import Optional

CPW_STATS_URL = "https://cpw.state.co.us/learn/Pages/SOPApplicationStatistics.aspx"
HEADERS = {"User-Agent": "DrawOddsApp/1.0 (educational use)"}


def fetch_available_years(session: requests.Session) -> list[dict]:
    """Return list of {year, url} for available draw stat files."""
    resp = session.get(CPW_STATS_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()

    # CPW links look like: "...DrawStatistics_2023.xlsx" or similar
    pattern = re.compile(r'href="([^"]+(?:Draw|Statistics)[^"]*\.(xlsx|pdf))"', re.IGNORECASE)
    found = pattern.findall(resp.text)

    years = []
    for path, ext in found:
        year_match = re.search(r"(20\d{2})", path)
        if year_match:
            year = int(year_match.group(1))
            url = path if path.startswith("http") else f"https://cpw.state.co.us{path}"
            years.append({"year": year, "url": url, "ext": ext.lower()})

    return sorted(years, key=lambda x: x["year"], reverse=True)


def parse_excel(filepath: str, year: int) -> dict:
    """
    Parse a CPW Excel draw statistics file.

    The exact column layout varies by year — this parser handles the most
    common format where rows represent hunt codes and columns represent
    preference point levels.

    Returns the standard import JSON dict.
    """
    import pandas as pd

    xl = pd.ExcelFile(filepath)
    all_hunts = []

    for sheet_name in xl.sheet_names:
        df = xl.parse(sheet_name, header=None)

        # Heuristic: find header row containing "Hunt Code" or "Unit"
        header_row = None
        for i, row in df.iterrows():
            row_str = " ".join(str(c).lower() for c in row if pd.notna(c))
            if "hunt code" in row_str or "unit" in row_str:
                header_row = i
                break

        if header_row is None:
            continue

        df.columns = df.iloc[header_row]
        df = df.iloc[header_row + 1:].reset_index(drop=True)

        # Identify point columns (numeric column headers)
        point_cols = {}
        for col in df.columns:
            try:
                pt = int(float(str(col)))
                point_cols[pt] = col
            except (ValueError, TypeError):
                pass

        for _, row in df.iterrows():
            hunt_code = str(row.get("Hunt Code", row.get("Code", ""))).strip()
            if not hunt_code or hunt_code.lower() in ("nan", "hunt code", "code"):
                continue

            unit = str(row.get("Unit", "")).strip()
            species = _infer_species(hunt_code, sheet_name)
            weapon_type = _infer_weapon(hunt_code)
            season_num = _infer_season(hunt_code)

            tags_col = next((c for c in df.columns if "license" in str(c).lower()
                             or "tag" in str(c).lower() or "quota" in str(c).lower()), None)
            tags = _safe_int(row.get(tags_col)) if tags_col else None

            # Build point buckets for resident applicants
            buckets = []
            for pt, col in sorted(point_cols.items()):
                applicants = _safe_int(row.get(col))
                if applicants is None:
                    continue
                buckets.append({"points": pt, "applicants": applicants, "successful": 0})

            # Derive successful from tags (simplified: fill top-down)
            _fill_successful_preference(buckets, tags)

            total_applicants = sum(b["applicants"] for b in buckets)
            successful_total = sum(b["successful"] for b in buckets)
            min_pts = next((b["points"] for b in reversed(buckets) if b["successful"] > 0), None)

            draw_result = {
                "year": year,
                "applicant_type": "resident",
                "tags_available": tags,
                "total_applicants": total_applicants,
                "min_points_drawn": min_pts,
                "overall_odds": round(successful_total / total_applicants, 4) if total_applicants else None,
                "point_buckets": buckets,
            }

            all_hunts.append({
                "hunt_code": hunt_code,
                "unit": unit,
                "species": species,
                "weapon_type": weapon_type,
                "season_number": season_num,
                "hunt_type": "limited",
                "draw_results": [draw_result],
            })

    return {"state_code": "CO", "hunts": all_hunts}


def _fill_successful_preference(buckets: list, tags: Optional[int]):
    """Assign successful counts top-down (highest points first) for preference system."""
    if tags is None:
        return
    remaining = tags
    for bucket in reversed(buckets):
        if remaining <= 0:
            bucket["successful"] = 0
        elif bucket["applicants"] <= remaining:
            bucket["successful"] = bucket["applicants"]
            remaining -= bucket["applicants"]
        else:
            bucket["successful"] = remaining
            remaining = 0


def _infer_species(hunt_code: str, sheet: str) -> str:
    code_lower = hunt_code.lower()
    sheet_lower = sheet.lower()
    for s in ("elk", "deer", "antelope", "bear", "moose", "sheep", "goat", "lion", "pronghorn"):
        if s in code_lower or s in sheet_lower:
            return s
    if "em" in code_lower[:2]:
        return "elk"
    if "dm" in code_lower[:2]:
        return "deer"
    if "am" in code_lower[:2]:
        return "antelope"
    return "unknown"


def _infer_weapon(hunt_code: str) -> str:
    code = hunt_code.upper()
    if "A" in code[3:5]:
        return "archery"
    if "M" in code[3:5]:
        return "muzzleloader"
    return "rifle"


def _infer_season(hunt_code: str) -> Optional[int]:
    for i, c in enumerate(hunt_code):
        if c.isdigit():
            return int(c)
    return None


def _safe_int(val) -> Optional[int]:
    try:
        return int(float(str(val)))
    except (ValueError, TypeError):
        return None


def main():
    parser = argparse.ArgumentParser(description="Scrape CPW draw statistics")
    parser.add_argument("--year", type=int, help="Specific year to scrape")
    parser.add_argument("--output", default="seed_data/co_scraped.json", help="Output JSON file")
    parser.add_argument("--import-url", help="If set, POST data to this API base URL")
    parser.add_argument("--admin-key", default="dev-secret-change-me", help="Admin API key")
    args = parser.parse_args()

    session = requests.Session()

    print("Fetching available years from CPW...")
    years = fetch_available_years(session)
    if not years:
        print("No files found. CPW may have changed their page structure.")
        sys.exit(1)

    if args.year:
        years = [y for y in years if y["year"] == args.year]
        if not years:
            print(f"Year {args.year} not found. Available: {[y['year'] for y in years]}")
            sys.exit(1)

    all_data = {"state_code": "CO", "hunts": []}

    for year_info in years[:1]:  # Default: latest year only
        print(f"Downloading {year_info['year']} ({year_info['url']})...")
        resp = session.get(year_info["url"], headers=HEADERS, timeout=60)
        resp.raise_for_status()

        tmp_file = f"/tmp/co_{year_info['year']}.{year_info['ext']}"
        with open(tmp_file, "wb") as f:
            f.write(resp.content)

        print(f"Parsing {year_info['ext']} file...")
        if year_info["ext"] == "xlsx":
            parsed = parse_excel(tmp_file, year_info["year"])
            all_data["hunts"].extend(parsed["hunts"])
        else:
            print(f"PDF parsing not yet implemented for {year_info['year']}, skipping.")

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w") as f:
        json.dump(all_data, f, indent=2)
    print(f"Saved {len(all_data['hunts'])} hunts to {args.output}")

    if args.import_url:
        print(f"Posting to {args.import_url}/api/admin/import/json ...")
        with open(args.output, "rb") as f:
            resp = requests.post(
                f"{args.import_url}/api/admin/import/json",
                files={"file": ("data.json", f, "application/json")},
                headers={"x-api-key": args.admin_key},
            )
        print(resp.json())


if __name__ == "__main__":
    main()
