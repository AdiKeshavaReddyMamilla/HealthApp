# Data schema

Pulse stores one **record per day**. This is the contract shared by the Apple
Shortcut (which produces records) and the app (which reads them).

## A single day

```json
{
  "date": "2026-07-30",
  "hrv": 68,
  "restingHR": 54,
  "sleepHours": 7.7,
  "respiratoryRate": 13.5,
  "spo2": 97,
  "activeEnergy": 530,
  "restingEnergy": 1650,
  "workouts": [
    { "type": "Run", "minutes": 32, "kcal": 300 },
    { "type": "Strength", "minutes": 45, "kcal": 260 }
  ],
  "source": "shortcut"
}
```

| Field             | Type   | Unit         | Required | Notes                                             |
|-------------------|--------|--------------|----------|---------------------------------------------------|
| `date`            | string | `YYYY-MM-DD` | no*      | Defaults to today if omitted.                     |
| `hrv`             | number | ms (SDNN)    | —        | Heart Rate Variability. Main driver of recovery.  |
| `restingHR`       | number | bpm          | —        | Resting heart rate. Lower vs baseline = better.   |
| `sleepHours`      | number | hours        | —        | Total sleep. Minutes (>24) are auto-converted.    |
| `respiratoryRate` | number | breaths/min  | —        | Sleeping respiratory rate.                        |
| `spo2`            | number | %            | no       | Optional; stored but not scored in v1.            |
| `activeEnergy`    | number | kcal         | no       | Active calories for the day. Shown in Calories.   |
| `restingEnergy`   | number | kcal         | no       | Resting/basal calories. Total = active + resting. |
| `workouts`        | array  | —            | no       | Today's workouts (see below). Shown in Workouts.  |
| `source`          | string | —            | no       | e.g. `shortcut`, `sample`, `manual`.              |

\* At least **one** metric (including calories or a workout) must be present for
the record to be accepted. Calories and workouts are **shown in the UI**; they do
not affect the recovery score.

### Workouts

Each workout is `{ "type": "Run", "minutes": 32, "kcal": 300 }`. From the simple
link (below) they come as a compact string — one workout per `;`, fields per `,`:

```
workouts=Run,32,300;Strength,45,260
```

## Multiple days

Send an array, or an object with a `records` array — useful for a one-time
backfill of history:

```json
[
  { "date": "2026-07-28", "hrv": 61, "restingHR": 56, "sleepHours": 7.1, "respiratoryRate": 14.0 },
  { "date": "2026-07-29", "hrv": 66, "restingHR": 55, "sleepHours": 7.9, "respiratoryRate": 13.6 }
]
```

## Field name flexibility

The importer accepts common aliases (case/space-insensitive), so you don't have
to match names exactly:

- `hrv` ← `heartRateVariability`, `sdnn`, `hrv_sdnn`
- `restingHR` ← `restingHeartRate`, `rhr`
- `sleepHours` ← `sleep`
- `respiratoryRate` ← `breathingRate`, `rr`
- `spo2` ← `bloodOxygen`
- `activeEnergy` ← `active`, `activeCalories`, `activeKcal`
- `restingEnergy` ← `resting`, `basal`, `basalEnergy`, `restingCalories`
- `workouts` ← `workout`

## How it reaches the app

There are two link forms. Both save locally (IndexedDB), then strip the data from
the URL. Everything stays on your device.

**Simple (recommended, one day) — plain `key=value` pairs:**

```
https://adikeshavareddymamilla.github.io/HealthApp/#hrv=68&rhr=54&rr=13.5&sleep=7.7&active=530&resting=1650&workouts=Run,32,300;Strength,45,260
```

The keys accept the same aliases as above (`hrv`, `rhr`, `rr`, `sleep`, `active`,
`resting`, `workouts`, `date`, …). This is what the Shortcut in
[SHORTCUT.md](SHORTCUT.md) builds. Empty values (e.g. `rhr=`) are simply ignored.

**Advanced (one or many days) — Base64 or plain JSON:**

```
https://adikeshavareddymamilla.github.io/HealthApp/#data=<base64 JSON>
```
