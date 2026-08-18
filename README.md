# PipeProctor Frontend

PipeProctor Frontend is the React and Vite client for the PipeProctor project. It uses Tailwind CSS for styling, React Router for navigation, and Recharts for data visualization (charts).

## Dependencies
- React 19
- React DOM 19
- Vite 8
- Tailwind CSS 4
- React Router 7
- Recharts 3
- IBM Plex Sans 5 (variable) and IBM Plex Mono 5 — self-hosted via Fontsource

## Design tokens

Both the brand palette and the typefaces are declared in the `@theme` block of
`src/index.css`, so they are available as ordinary Tailwind utilities.

**Accent color** — the green of the Niger flag (`#0DB02B`) sits at `brand-500`,
with a full `brand-50` to `brand-950` scale around it. Use `brand-700` or darker
behind white text; it is the lightest step that clears the WCAG AA 4.5:1
contrast ratio.

**Typography** — IBM Plex Sans is the UI face and applies to the whole app
through Tailwind's preflight, so no wrapper class is needed. IBM Plex Mono is
available as `font-mono` for coordinates, sensor IDs, and timestamps. The font
files are installed as npm packages and imported in `src/main.jsx`, meaning they
are bundled and served locally — there is no request to a font CDN at runtime.
The variable sans covers weights 100–700, so avoid `font-extrabold` and
`font-black`, which the browser would have to synthesize.

**Segments** — the monitored strip is not addressed by place names. It is the
first 20 km of pipeline north of the Sèmè terminal in Benin, cut into 20 chips
of one kilometre each (`src/lib/corridor.js`, mirroring the model's
`chips_metadata_v2.csv`). Detections arrive as bare coordinates and are placed
on a segment by nearest chip centre; anything further than `MAX_OFFSET_KM` off
stays unplaced and renders as "Off corridor". The schematic colours a whole
segment by the worst severity still open in it rather than dropping a dot at a
kilometre mark.

**Severity** — detections are coloured by `severity-low` / `severity-medium` /
`severity-high`. These are status colours, not chart series colours: medium sits
below 3:1 against white on purpose, so every place they appear also carries a
text label and the colour never has to be read on its own.

## Screens

| Screen | What it does |
|---|---|
| `Dashboard` | KPI row, weekly detection trend, active-by-severity split, corridor schematic, recent detections |
| `Monitoring` | Corridor schematic plus the full detection list, filterable by text, segment, severity, and status |
| `Analysis` | Send a pair of GeoTIFF captures — reference and current — for one segment, read back the anomaly score and changed patch, and optionally record it as a detection |
| `Model` | What the CROMA change detector is and how it scores a pair, plus the observed distribution of recorded detections |
| `Settings` | Account profile (saved via the API); detection thresholds and notifications (not persisted — no endpoint yet) |

All three services call the API — there is no mock data left in the app.
`monitoringService` reads `/api/v1/detections` and derives the weekly trend from
it, `analysisService` posts a multipart pair to `/api/v1/change-detection`, and
`modelService` describes the model and counts the distributions over the same
detection list. `src/lib/detections.js` holds the labels, badge styles, and
formatters; `src/lib/corridor.js` holds the strip geometry and is the only place
coordinates become a segment.

Two shapes are the client's own reading rather than stored fields: **severity**
is a threshold over the model's `confidence`, and **segment** is the nearest
chip centre to a detection's coordinates. Both rules live in `src/lib/`.

> **Note:** the `Model` page shows no precision, recall, or training curves. The
> backend exposes no evaluation endpoint, so there is nothing measured to
> report; everything shown is counted from live detections.

## Runbook

The app is two processes: the FastAPI backend on `:8000` and the Vite dev
server on `:5173`. Start the backend first — the frontend reads everything it
displays from it, so with the API down every page shows a load error.

### 1. Backend

```bash
cd Pipe_Proctor/backend

python3 -m venv .venv
source .venv/bin/activate          # Windows / Git Bash: source .venv/Scripts/activate
pip install -r requirements.txt
```

Create `Pipe_Proctor/backend/.env` (gitignored — never commit it):

```bash
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_KEY=<service-role key>
JWT_SECRET_KEY=<long random string>
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Generate the JWT secret with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

`SUPABASE_URL` and `SUPABASE_KEY` are required. `SupabaseDatabase.__init__`
calls `create_client()` at import time, so a missing or blank URL stops the
whole app from starting, not just the database.

Then run it:

```bash
uvicorn main:app --reload --port 8000
```

- API: <http://127.0.0.1:8000>
- Interactive docs: <http://127.0.0.1:8000/docs>
- Liveness: <http://127.0.0.1:8000/health>

### 2. Frontend

In a second terminal, from this folder:

```bash
cp .env.example .env               # then set VITE_API_URL
npm install
npm run dev
```

`VITE_API_URL` selects the API: `http://localhost:8000` for the local backend,
`https://pipe-proctor.vercel.app` for the deployed one. Vite reads `.env` only
at startup, so restart the dev server after changing it.

The app runs at <http://localhost:5173>. The port is pinned with
`strictPort`, so a busy port fails loudly rather than drifting to 5174 — the
backend allows origins by exact port, and a silent drift turns every API call
into an opaque CORS error.

### 3. Model inference (optional)

Everything except the `Analysis` page works without this. The change-detection
endpoint needs PyTorch and the CROMA weights, which are far too large for the
Vercel deployment; without them the endpoint returns `503` and the rest of the
API is unaffected.

```bash
cd Pipe_Proctor/backend
pip install -r requirements.txt -r requirements-model.txt

# CROMA encoder weights (777 MB) -- gitignored, fetched from the CROMA repo
curl -L -o model_app/models/CROMA_base.pt \
  https://huggingface.co/antofuller/CROMA/resolve/main/CROMA_base.pt
```

Two files also have to be in place, both from the `model` branch:
`use_croma.py` in `backend/`, and `chips_metadata_v2.csv` in
`backend/model_app/data/`. Restart uvicorn afterwards — the imports are
resolved once at startup, so a running server will not pick them up.

Inference takes roughly 40 seconds per pair on CPU.

### Maintenance

Retire detections that should not be in the log. Reports only unless you pass
`--delete`:

```bash
cd Pipe_Proctor/backend
python scripts/prune_detections.py --off-corridor            # dry run
python scripts/prune_detections.py --off-corridor --delete
python scripts/prune_detections.py --id <uuid> --delete
```

### Troubleshooting

| Symptom | Cause |
|---|---|
| `ensurepip is not available` on `python3 -m venv` | Debian/Ubuntu ships it separately: `sudo apt install python3-venv` |
| `SupabaseException: supabase_url is required` | `backend/.env` is missing or has no `SUPABASE_URL` |
| Every page shows a load error | Backend is not running, or `VITE_API_URL` points somewhere else |
| "CORS Missing Allow Origin" | Usually the backend being down, not CORS. Check it responds on `/health` first; if it does, confirm the frontend's port is in the backend's `ALLOWED_ORIGINS` |
| `Analysis` returns 503 | Model dependencies or weights are not installed — see step 3 |
| `Analysis` returns 404 | The `segment_id` is not in `chips_metadata_v2.csv` |

# References
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vite.dev/guide/)
- [Tailwind Documentation](https://tailwindcss.com/docs/installation/using-vite)
- [React Router Documentation](https://reactrouter.com/home)
- [Recharts Documentation](https://recharts.org/en-US/api)
- [IBM Plex typeface](https://www.ibm.com/plex/)
- [Fontsource Documentation](https://fontsource.org/docs/getting-started/introduction)
