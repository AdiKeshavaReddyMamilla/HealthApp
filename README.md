# Pulse — your free Apple Watch recovery app 💙

A private, **completely free** health dashboard that turns your Apple Watch data
into the kind of **recovery**, **heart rate**, **sleep** and **daily morning
summary** the paid apps (WHOOP, Oura…) charge a subscription for.

- **Free forever** — no subscription, no account, no ads.
- **Private by default** — your data is stored only on your device (IndexedDB).
  There is no server and nothing is uploaded anywhere.
- **Works from your iPhone (and iPad)** — it's a Progressive Web App you add to
  your Home Screen; it looks and feels like a native app and works offline.
- **No Mac required** — nothing to compile. It runs in the browser and installs
  to your Home Screen.

> ⚕️ Pulse is a personal wellness tool, **not a medical device**. Don't use it for
> diagnosis. Apple Watch does **not** measure blood pressure, so BP isn't included
> (a Bluetooth cuff that writes to Apple Health could be added later).

---

## What it shows

- A **recovery score (0–100%)** with WHOOP-style color bands, computed from your
  **HRV**, **resting heart rate**, **sleep**, and **respiratory rate** — measured
  against *your own* rolling baseline, so it adapts to your body over ~2–4 weeks.
- A plain-language **morning summary** ("You're primed — HRV ▲ 8% vs baseline…").
- **Trend sparklines** for each metric over the last two weeks.

While it's still learning your baseline (first ~week) it shows a **“calibrating”**
badge instead of pretending to be precise.

---

## How your Apple Watch data gets in

Apple Health data can only be *pushed out* of your iPhone — there's no web link to
it. Pulse uses a **free Apple Shortcut** you build once:

```
Apple Watch → Apple Health → [free Shortcut, runs 7am] → opens Pulse with today's data
```

Follow **[docs/SHORTCUT.md](docs/SHORTCUT.md)** to set it up (~10 min, once). The
data format is documented in **[docs/DATA_SCHEMA.md](docs/DATA_SCHEMA.md)**.

Not ready to set up the Shortcut yet? Open the app and tap **“Load sample data”**
to explore everything immediately, or **“Import JSON”** to paste readings by hand.

---

## Get it running (one-time)

1. **Enable free hosting (GitHub Pages).**
   In this repo on GitHub: **Settings → Pages → Build and deployment → Source:
   “GitHub Actions.”** The included workflow (`.github/workflows/pages.yml`)
   publishes the site automatically on every push.
   Your app URL will be:

   ```
   https://<your-github-username>.github.io/HealthApp-/
   ```

2. **Add it to your Home Screen.**
   Open that URL in **Safari** on your iPhone → **Share** → **Add to Home Screen**.
   Now “Pulse” launches full-screen like a real app.

3. **Set up the morning Shortcut.**
   Follow **[docs/SHORTCUT.md](docs/SHORTCUT.md)** and paste your app URL where
   indicated. Each morning it exports your Watch data and opens Pulse to your
   summary.

---

## How the recovery score works

Weighted blend of four sub-scores, each measured against your personal baseline
(rolling ~30-day mean & spread):

| Metric            | Weight | Better when…                    |
|-------------------|:------:|---------------------------------|
| HRV               |  50%   | higher than your baseline       |
| Resting heart rate|  25%   | lower than your baseline        |
| Sleep             |  15%   | close to ~8h                    |
| Respiratory rate  |  10%   | steady (near your baseline)     |

Bands: **≥ 67 recovered** (green) · **34–66 moderate** (amber) · **< 34 strained** (red).
All of this runs on-device in [`js/recovery.js`](js/recovery.js) — read it, tweak the
weights, make it yours.

---

## Project layout

```
index.html              App shell (morning summary, ring, tiles, charts)
styles.css              Futuristic dark UI (light mode supported)
js/recovery.js          The recovery engine (baselines + scoring)
js/summary.js           Morning-summary text generator
js/storage.js           On-device storage (IndexedDB + fallback)
js/ingest.js            URL/hash + paste import, sample-data generator
js/charts.js            Dependency-free SVG sparklines
js/app.js               Wiring & rendering
manifest.webmanifest    PWA manifest (installable)
sw.js                   Service worker (offline)
icons/                  App icons
docs/SHORTCUT.md        Build the free Apple Shortcut
docs/DATA_SCHEMA.md     The daily data format
```

No build step, no dependencies — just static files. Edit and refresh.

---

## Run it locally (optional)

```bash
python3 -m http.server 8099
# then open http://localhost:8099
```

Made to be free, private, and yours. 🩵
