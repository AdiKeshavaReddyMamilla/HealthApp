# Set up the free "morning" Apple Shortcut (easy version)

This one-time setup lets your iPhone push your Apple Watch data into Pulse each
morning — **no laptop, no Mac, no paid app, no account, and no technical steps
like "JSON" or "Base64."** It uses Apple's free **Shortcuts** app (already on your
iPhone/iPad).

The whole idea is simple:

> **Read a few Health numbers → drop them into a link → open the link.**
> Pulse reads the numbers straight from the link. That's it.

> **Time needed:** ~5–10 minutes, once.

**First, copy your app's link.** On GitHub, go to **Settings → Pages** and copy the
address in the green **"✓ Your site is live at …"** banner. For this repo it is:

```
https://adikeshavareddymamilla.github.io/HealthApp/
```

Keep it handy — you'll paste it in Step 5.

---

## Part A — Build the Shortcut

1. Open **Shortcuts** → tap **+** to create a new one → name it **"Morning Health."**
2. You'll add actions with **+ Add Action** and search each one by name.

Each health number takes the **same little 2-action pattern**. Do it three times,
changing only the **Type**:

### Step 1 — HRV
1. Add **Find Health Samples.** Tap to set:
   - **Type:** Heart Rate Variability
   - **Sort:** Start Date · **Order:** Latest First · **Limit:** 1
2. Add **Get Details of Health Samples** → choose detail **Value.**
3. Add **Set Variable** → name it **HRV.**

### Step 2 — Resting Heart Rate
Repeat the same three actions, but in **Find Health Samples** set
**Type = Resting Heart Rate**, and name the variable **RHR.**

### Step 3 — Respiratory Rate
Repeat again with **Type = Respiratory Rate**, and name the variable **RR.**

> 💤 **Sleep is optional** and is the one slightly fiddly metric, so we leave it out
> of the easy version — Pulse still calculates your recovery from HRV, resting heart
> rate and respiratory rate, and just weights them a little differently. You can add
> sleep later (see "Adding sleep" below).

### Step 4 — Build the link
Add a **Text** action and type your link exactly like this, inserting the **HRV**,
**RHR**, and **RR** variables where shown (tap the variable bar above the keyboard):

```
https://adikeshavareddymamilla.github.io/HealthApp/#hrv=HRV&rhr=RHR&rr=RR
```

So it reads literally: `.../HealthApp/#hrv=` then the **HRV** variable, `&rhr=` then
the **RHR** variable, `&rr=` then the **RR** variable. (Use your own link from
Settings → Pages if it's different.)

### Step 5 — Open Pulse
Add **Open URLs** → set its input to the **Text** from Step 4.

Now tap **▶ (play)** to test. The first time, tap **Allow** when it asks to read
Health data. **Pulse should open showing your real numbers.** 🎉

---

## Part B — Run it automatically every morning

1. In Shortcuts, open the **Automation** tab → **+** → **Create Personal Automation.**
2. Choose **Time of Day** → set your wake time (e.g. **7:00 AM**) → **Daily.**
3. **Next** → **Add Action** → search **Run Shortcut** → pick **Morning Health.**
4. On the automation's summary screen, turn **Ask Before Running OFF** (and
   **Notify When Run** off if you like) so it runs quietly and just pops Pulse open
   with your fresh morning summary.

Done — each morning your recovery, HRV, resting heart rate and respiratory rate are
waiting for you, for free.

---

## Adding sleep later (optional)

Sleep needs a tiny bit of math because Health stores it as a duration:

1. Add another **Find Health Samples** → **Type = Sleep Analysis**,
   **Sort:** Start Date · **Latest First** · a **Limit** of, say, 20.
2. Add **Get Details of Health Samples** → **Duration** (this is in **seconds**).
3. Add **Calculate Statistics** → **Sum** of those durations.
4. Add **Calculate** → divide by **3600** (seconds → hours). Set variable **Sleep.**
5. In your Step 4 link, add `&sleep=` and the **Sleep** variable to the end:
   ```
   .../HealthApp/#hrv=HRV&rhr=RHR&rr=RR&sleep=Sleep
   ```

---

## Adding calories (optional)

Calories are stored as many small samples through the day, so you **sum today's**,
rather than taking the latest one.

**Active energy:**
1. **Find Health Samples** → **Type = Active Energy** · add filter **Start Date is Today**.
   (Leave Limit **off** so you get all of today's samples.)
2. **Get Details of Health Samples** → **Value**.
3. **Calculate Statistics** → **Sum**. → **Set Variable** → **Active.**

**Resting energy:** repeat the three steps with **Type = Resting Energy**, and name
the variable **Resting.**

Then extend your Step 4 link with `&active=` and `&resting=`:
```
.../HealthApp/#hrv=HRV&rhr=RHR&rr=RR&active=Active&resting=Resting
```
Pulse shows **Active**, **Resting**, and their **Total** in the Calories section.

---

## Adding workouts (optional, advanced)

This one uses a loop to list today's workouts.

1. **Find Workouts** → add filter **Start Date is Today**.
2. **Repeat with Each** (input = the workouts found). Inside the repeat:
   - **Text** → `[Workout Type],[Duration in min],[Active Energy in kcal];`
     (insert those three as variables from **Repeat Item**, separated by commas,
     ending with a semicolon `;`).
   - **Add to Variable** → **WorkoutList.**
3. After the repeat, add `&workouts=` and the **WorkoutList** variable to your link:
   ```
   .../HealthApp/#hrv=HRV&rhr=RHR&rr=RR&workouts=WorkoutList
   ```
   The result looks like `workouts=Run,32,300;Strength,45,260`, and Pulse lists each
   workout in **Today's workouts**.

> Prefer not to build the loop? You can also add workouts by hand with the app's
> **Import JSON** button — see [DATA_SCHEMA.md](DATA_SCHEMA.md).

---

## Troubleshooting

- **"No data" / numbers don't update:** run the Shortcut manually (▶) and check
  **Settings → Privacy & Security → Health → Shortcuts** has read access on. Fresh
  Apple Watch readings can take a few minutes to sync to your iPhone after you wake.
- **A number looks blank or 0:** you may not have that metric recorded yet today.
  HRV and resting heart rate are usually recorded overnight; give the Watch a night.
- **Want to backfill past days?** Use the app's **Import JSON** button
  (see [DATA_SCHEMA.md](DATA_SCHEMA.md)). Recovery gets sharper after ~2 weeks of data.
- **Blood pressure?** The Apple Watch can't measure it. If you pair a Bluetooth cuff
  that writes to Apple Health, we can add it later.

---

### Advanced (optional): the JSON link

Pulse also accepts a `#data=<base64 JSON>` link and full JSON via **Import**, which is
handy for backfilling many days at once — see [DATA_SCHEMA.md](DATA_SCHEMA.md). The
simple `#hrv=…&rhr=…` link above is all you need for daily use.
