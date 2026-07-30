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
| `source`          | string | —            | no       | e.g. `shortcut`, `sample`, `manual`.              |

\* At least **one** metric field must be present for the record to be accepted.

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

## How it reaches the app

The Shortcut Base64-encodes the JSON and opens:

```
https://<your-user>.github.io/HealthApp-/#data=<base64 JSON>
```

The app decodes `#data=`, saves the record(s) locally (IndexedDB), then strips
the data from the URL. Everything stays on your device.
