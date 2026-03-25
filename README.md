# 🦌 Draw Odds — Big Game Draw Calculator

A mobile-friendly web application for calculating big game draw odds across western US states.
Enter your preference points and instantly see your draw odds based on historical state data.

---

## Features

- **Odds calculator** — enter preference points, get instant draw odds
- **Historical trends** — see how points required has changed year over year
- **Point bucket visualization** — see where you fall in the applicant pool
- **Multi-state support** — preference, bonus, and random draw systems
- **Admin panel** — import data via JSON file or run state scrapers
- **Mobile-first design** — works great on phones in the field

---

## Quick Start (Local Dev)

### Prerequisites
- Python 3.11+
- Node.js 20+

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

The API runs at **http://localhost:8000**
Swagger docs at **http://localhost:8000/docs**

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:5173**

### 3. Load Sample Data

1. Open the Admin panel at http://localhost:5173/admin
2. Enter the dev API key: `dev-secret-change-me`
3. Click **Create State** → fill in `CO` / `Colorado` / `preference`
4. Click **Load Colorado Seed Data**
5. Navigate to **Hunts** — you should see 6 Colorado hunts loaded

---

## Project Structure

```
draw-odds-app/
├── backend/
│   ├── main.py              # FastAPI app entrypoint
│   ├── database.py          # SQLAlchemy DB setup
│   ├── models.py            # ORM models (State, Hunt, DrawResult, PointBucket)
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── routers/
│   │   ├── hunts.py         # Hunt + state search endpoints
│   │   ├── odds.py          # Odds calculation engine
│   │   └── admin.py         # Data import endpoints
│   ├── scrapers/
│   │   └── colorado.py      # CPW draw statistics scraper
│   └── seed_data/
│       └── colorado_seed.json   # Sample CO data (elk, deer, antelope)
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── pages/
    │   │   ├── Home.jsx         # State/species picker
    │   │   ├── HuntList.jsx     # Search & filter hunts
    │   │   ├── HuntDetail.jsx   # Odds calculator + charts
    │   │   └── Admin.jsx        # Data import admin panel
    │   └── components/
    │       ├── OddsGauge.jsx        # Color-coded odds display
    │       ├── OddsChart.jsx        # Historical odds trend chart
    │       └── PointsBucketChart.jsx # Applicant distribution chart
    └── ...
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/states` | List all states |
| GET | `/api/states/{code}/species` | Species available in a state |
| GET | `/api/hunts` | Search hunts (filter by state, species, unit, weapon) |
| GET | `/api/hunts/{id}` | Get hunt details |
| GET | `/api/hunts/{id}/draw-results` | Get historical draw data |
| GET | `/api/odds?hunt_id=&points=&applicant_type=` | **Calculate draw odds** |
| GET | `/api/odds/compare?hunt_ids=1,2,3&points=5` | Compare odds across hunts |
| POST | `/api/admin/states` | Create a state (admin) |
| POST | `/api/admin/import/seed` | Load bundled CO seed data (admin) |
| POST | `/api/admin/import/json` | Import JSON data file (admin) |

---

## Data Import Format

To add data for new states or years, create a JSON file matching this format:

```json
{
  "state_code": "CO",
  "hunts": [
    {
      "hunt_code": "EM002O1R",
      "unit": "2",
      "species": "elk",
      "subspecies": "bull",
      "weapon_type": "rifle",
      "season_number": 1,
      "hunt_type": "limited",
      "draw_results": [
        {
          "year": 2023,
          "applicant_type": "resident",
          "tags_available": 40,
          "total_applicants": 680,
          "min_points_drawn": 11,
          "avg_points_drawn": 12.4,
          "point_buckets": [
            {"points": 0,  "applicants": 210, "successful": 0},
            {"points": 11, "applicants": 42,  "successful": 40}
          ]
        }
      ]
    }
  ]
}
```

---

## Scraping New Data

### Colorado (CPW)

```bash
cd backend
python scrapers/colorado.py --year 2023 --output seed_data/co_2023.json

# Or post directly to the API:
python scrapers/colorado.py --year 2023 --import-url http://localhost:8000 --admin-key your-key
```

CPW publishes draw statistics at:
https://cpw.state.co.us/learn/Pages/SOPApplicationStatistics.aspx

### Adding New States

1. Create the state via admin panel or API
2. Write a scraper in `backend/scrapers/{state_code}.py` following the Colorado template
3. Import data via the JSON endpoint

**State Data Sources:**
| State | URL |
|-------|-----|
| Colorado (CO) | https://cpw.state.co.us/learn/Pages/SOPApplicationStatistics.aspx |
| Wyoming (WY) | https://wgfd.wyo.gov/Hunting/Apply-for-Licenses/Draw-Results |
| Montana (MT) | https://fwp.mt.gov/hunt/draw |
| Idaho (ID) | https://idfg.idaho.gov/hunt/drawings |
| Nevada (NV) | https://www.ndow.org/hunting/draw |
| Utah (UT) | https://wildlife.utah.gov/hunting/main-hunting-page/big-game/drawing-statistics.html |
| Arizona (AZ) | https://www.azgfd.com/hunting/draw_results |

---

## Draw System Support

| System | States | Description |
|--------|--------|-------------|
| **Preference** | CO, WY, MT | Highest point holders draw first; cutoff year = random lottery |
| **Bonus** | NV, AZ | Each point = +1 weighted ticket in random draw |
| **Random** | Some hunts | Pure lottery, points don't affect odds |

---

## Deployment

### Render.com (Recommended — Free Tier)

1. Push this repo to GitHub
2. Create a Render account at render.com
3. Click "New" → "Blueprint" → connect your repo
4. Render reads `render.yaml` and deploys both services automatically
5. After deploy, note your API URL and update `ALLOWED_ORIGINS` in the backend env vars

### Environment Variables

**Backend:**
| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_API_KEY` | `dev-secret-change-me` | **Change in production!** |
| `DATABASE_URL` | `sqlite:///./draw_odds.db` | DB connection string |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated CORS origins |
| `ENV` | — | Set to `development` to allow all origins |

---

## Roadmap

- [ ] Wyoming data scraper
- [ ] User accounts + point tracking across states
- [ ] Push notifications when points thresholds change
- [ ] Tag worth estimator (trophy scores × odds)
- [ ] Apply-by-date reminders per state
- [ ] Compare multiple hunts side-by-side
- [ ] PWA (installable on phone home screen)

---

## Disclaimer

Draw odds are estimates based on historical data and are not guaranteed. Always verify
draw statistics and application deadlines directly with state wildlife agencies.
Data is sourced from publicly available state records.
