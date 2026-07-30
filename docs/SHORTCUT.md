# Set up the free "morning export" Apple Shortcut

This one-time setup lets your iPhone push your Apple Watch data into Pulse each
morning — **no laptop, no Mac, no paid app, no account.** It uses Apple's free
**Shortcuts** app (pre-installed on your iPhone/iPad).

> **Time needed:** ~10 minutes, once.

First, get your app's URL. After you enable GitHub Pages (see the main
[README](../README.md)), it will be:

```
https://<your-github-username>.github.io/HealthApp-/
```

Keep that handy — you'll paste it near the end.

---

## Part A — Build the Shortcut

1. Open **Shortcuts** → tap **+** (new shortcut) → name it **“Morning Health Export.”**
2. Add the actions below in order. Tap **+ Add Action** and search for each by name.

### 1. Get HRV
- Add **Find Health Samples**.
- Set **Type = Heart Rate Variability**.
- **Sort by Start Date**, **Order Latest First**, **Limit = 1**.
- Tap the action's result and rename the *Variable* to **HRV** (long-press → Rename, or use “Set Variable”).

> Tip: after each “Find Health Samples”, add a **Set Variable** action to store the
> result in a clearly named variable (HRV, RHR, Sleep, RR). This keeps the next steps tidy.

### 2. Get Resting Heart Rate
- **Find Health Samples** → **Type = Resting Heart Rate** → Latest First → Limit 1 → set variable **RHR**.

### 3. Get Respiratory Rate
- **Find Health Samples** → **Type = Respiratory Rate** → Latest First → Limit 1 → set variable **RR**.

### 4. Get Sleep (hours)
- **Find Health Samples** → **Type = Sleep Analysis** → today’s **Asleep** duration.
- Use **Calculate Statistics** (Sum of durations) or, simplest, grab the most recent
  **Sleep** sample’s duration. Convert to **hours** if it’s in minutes
  (add a **Calculate** action: value **÷ 60**). Set variable **Sleep**.

### 5. Build the data dictionary
- Add **Dictionary** and create these keys (all **Number**, value = the matching variable):

  | Key               | Value      |
  |-------------------|------------|
  | `hrv`             | HRV        |
  | `restingHR`       | RHR        |
  | `sleepHours`      | Sleep      |
  | `respiratoryRate` | RR         |

  (You can add `date` as **Text** using the **Current Date** formatted as
  `yyyy-MM-dd`, but it’s optional — Pulse defaults to today.)

### 6. Convert to JSON text
- Add **Get Dictionary from Input**? No — instead add **Text** and insert the
  **Dictionary** variable, *or* use the **“Get Text from Input”** action with the
  Dictionary. The goal is a JSON **string**. (Shortcuts renders a Dictionary as JSON text.)

### 7. Base64-encode it
- Add **Base64 Encode** → **Input = the JSON text** from step 6.
  (Line breaks off.)

### 8. Build the URL
- Add **Text** with exactly:

  ```
  https://<your-github-username>.github.io/HealthApp-/#data=[Base64 Encoded]
  ```

  Replace `<your-github-username>` and insert the **Base64 Encoded** variable where
  shown.
- Add **URL Encode** on that text **only if** you prefer — the app accepts both.

### 9. Open the app
- Add **Open URLs** → input = the URL from step 8.

Tap the play ▶ button once to test. Grant Health read permissions when prompted.
Pulse should open with your real numbers. 🎉

---

## Part B — Run it automatically every morning

1. In Shortcuts, go to the **Automation** tab → **+** → **Create Personal Automation**.
2. Choose **Time of Day** → set **7:00 AM** (or whenever you wake) → **Daily**.
3. Action → **Run Shortcut** → pick **Morning Health Export**.
4. Turn **“Ask Before Running” OFF** so it runs silently and just pops Pulse open
   with your fresh morning summary.

That's it. Each morning your recovery, HRV, resting heart rate, sleep and
respiratory rate are waiting for you — for free.

---

## Troubleshooting

- **“No data” in the app:** run the Shortcut manually (▶) and check Health
  permissions (Settings → Privacy → Health → Shortcuts). New Apple Watch metrics
  can take a few minutes to sync to your iPhone after you wake.
- **Sleep looks wrong (e.g. 460):** it’s in minutes — make sure step 4 divides by 60.
- **Want to backfill history?** Use the app’s **Import JSON** button and paste an
  array of past days (see [DATA_SCHEMA.md](DATA_SCHEMA.md)). Recovery accuracy
  improves once you have ~2 weeks of data.
- **Blood pressure?** The Apple Watch cannot measure it. If you own a compatible
  Bluetooth cuff that writes to Apple Health, we can add it later.
