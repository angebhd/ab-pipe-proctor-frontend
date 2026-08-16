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

**Segments** — the corridor is not addressed by place names. It is split into
20 equal segments (`SEGMENT_COUNT` in `src/services/monitoringService.js`),
numbered 1 at Agadem through 20 at the terminal, and every detection carries a
segment number. The schematic colours a whole segment by the worst severity
still open in it rather than dropping a dot at a kilometre mark.

**Severity** — detections are coloured by `severity-low` / `severity-medium` /
`severity-high`. These are status colours, not chart series colours: medium sits
below 3:1 against white on purpose, so every place they appear also carries a
text label and the colour never has to be read on its own.

## Screens

| Screen | What it does |
|---|---|
| `Dashboard` | KPI row, weekly detection trend, active-by-severity split, corridor schematic, recent detections |
| `Monitoring` | Corridor schematic plus the full detection list, filterable by text, segment, severity, and status |
| `Analysis` | Send one capture — image, capture date, and segment — to the model and read back what it makes of it |
| `Model` | Model card for the fine-tuned Prithvi-EO-2.0, headline metrics, F1 per epoch, and per-anomaly-type scores |
| `Settings` | Detection thresholds and notification preferences (local state only) |

Detection data comes from `src/services/monitoringService.js`, model results
from `src/services/modelService.js`, and inference from
`src/services/analysisService.js` — all three are mocks that mirror the shapes
the backend is expected to return. `analysisService.analyzeImage` fabricates a
prediction from a hash of the submitted file, so the same image on the same
segment always scores the same; swap it for a multipart `apiClient` call once
the model is served. Swap their getters for `apiClient` calls and the
pages should not need changes. `src/lib/detections.js` holds the labels, badge
styles, and formatters shared across pages.

> **Note:** every number on the `Model` page is a placeholder, not a measured
> result. Replace them before the figures are shown or reported anywhere.

## Runbook

1. Clone the repository
```bash
git clone https://github.com/Aicha-code/.git
cd Pipe_Proctor/
```
2. Access the frontend folder
```bash
cd frontend
```
> **Note:** No environment variables are required for local development.


3. Install dependencies
```bash
npm install
```
4. Run the frontend in dev mode

```bash
npm run dev
```
You can also copy and paste these commands from the frontend folder:
```bash
cd frontend
npm install
npm run dev
```


# References
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vite.dev/guide/)
- [Tailwind Documentation](https://tailwindcss.com/docs/installation/using-vite)
- [React Router Documentation](https://reactrouter.com/home)
- [Recharts Documentation](https://recharts.org/en-US/api)
- [IBM Plex typeface](https://www.ibm.com/plex/)
- [Fontsource Documentation](https://fontsource.org/docs/getting-started/introduction)
