/*
 * recovery.js — on-device recovery engine (WHOOP/Oura-inspired).
 *
 * Everything here runs in the browser. It takes a history of daily records and
 * computes a 0–100 recovery score from the "core recovery set": HRV, resting
 * heart rate, sleep, and respiratory rate. Scores are relative to YOUR own
 * rolling baseline, so the app adapts to your body over ~2–4 weeks.
 *
 * Attaches to window.HealthApp.recovery
 */
(function (global) {
  'use strict';

  // How many trailing days to use for a personal baseline, and the minimum
  // amount of history before we trust it (otherwise we show "calibrating").
  var BASELINE_WINDOW = 30;
  var MIN_HISTORY_DAYS = 7;

  // Sensible population defaults used while we don't have enough of YOUR data.
  var DEFAULTS = {
    hrv:             { mean: 50,  std: 15 },   // ms (SDNN)
    restingHR:       { mean: 60,  std: 7  },   // bpm
    sleepHours:      { mean: 7.5, std: 1  },   // hours
    respiratoryRate: { mean: 15,  std: 1.5 }   // breaths / min
  };

  // Relative importance of each metric. HRV dominates, like the paid apps.
  var WEIGHTS = {
    hrv:             0.50,
    restingHR:       0.25,
    sleepHours:      0.15,
    respiratoryRate: 0.10
  };

  var SLEEP_NEED_HOURS = 8;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function mean(nums) {
    if (!nums.length) return null;
    return nums.reduce(function (a, b) { return a + b; }, 0) / nums.length;
  }

  function std(nums, m) {
    if (nums.length < 2) return null;
    var variance = nums.reduce(function (a, b) {
      return a + (b - m) * (b - m);
    }, 0) / (nums.length - 1);
    return Math.sqrt(variance);
  }

  /*
   * Build a per-metric baseline from history (excluding the day being scored).
   * Returns { calibrating, days, metrics: { hrv:{mean,std}, ... } }.
   */
  function computeBaselines(history, excludeDate) {
    var recent = history
      .filter(function (r) { return r.date !== excludeDate; })
      .slice(-BASELINE_WINDOW);

    var metrics = {};
    var maxDays = 0;

    Object.keys(DEFAULTS).forEach(function (key) {
      var values = recent
        .map(function (r) { return r[key]; })
        .filter(function (v) { return typeof v === 'number' && !isNaN(v); });

      maxDays = Math.max(maxDays, values.length);

      if (values.length >= MIN_HISTORY_DAYS) {
        var m = mean(values);
        var s = std(values, m) || DEFAULTS[key].std;
        metrics[key] = { mean: m, std: Math.max(s, 0.5), personal: true };
      } else {
        metrics[key] = {
          mean: DEFAULTS[key].mean,
          std: DEFAULTS[key].std,
          personal: false
        };
      }
    });

    return {
      calibrating: maxDays < MIN_HISTORY_DAYS,
      days: maxDays,
      metrics: metrics
    };
  }

  // --- Individual metric sub-scores (each 0–100, higher = better recovered) ---

  function scoreHRV(value, base) {
    var z = (value - base.mean) / base.std;      // higher HRV = better
    return clamp(50 + z * 20, 0, 100);
  }

  function scoreRestingHR(value, base) {
    var z = (value - base.mean) / base.std;       // lower RHR = better
    return clamp(50 - z * 20, 0, 100);
  }

  function scoreSleep(value) {
    // Full credit at the sleep need; gentle penalty below it. Capped so a huge
    // lie-in doesn't inflate the score.
    var ratio = clamp(value, 0, SLEEP_NEED_HOURS + 1) / SLEEP_NEED_HOURS;
    return clamp(ratio * 100, 0, 100);
  }

  function scoreRespiratory(value, base) {
    var z = Math.abs(value - base.mean) / base.std; // deviation = worse
    return clamp(100 - z * 25, 0, 100);
  }

  var SCORERS = {
    hrv: scoreHRV,
    restingHR: scoreRestingHR,
    sleepHours: function (v) { return scoreSleep(v); },
    respiratoryRate: scoreRespiratory
  };

  function bandFor(score) {
    if (score >= 67) return { key: 'high',   label: 'Recovered',  color: '#22e39b' };
    if (score >= 34) return { key: 'medium', label: 'Moderate',   color: '#ffca3a' };
    return { key: 'low', label: 'Strained', color: '#ff5c72' };
  }

  /*
   * Compute recovery for a single day given the full history.
   * Returns a rich object the UI can render directly.
   */
  function computeRecovery(today, history) {
    if (!today) return null;
    var baselines = computeBaselines(history, today.date);

    var contributions = [];
    var totalWeight = 0;
    var weightedSum = 0;
    var metricDetails = {};

    Object.keys(WEIGHTS).forEach(function (key) {
      var value = today[key];
      if (typeof value !== 'number' || isNaN(value)) return; // metric missing today

      var base = baselines.metrics[key];
      var subScore = SCORERS[key](value, base);
      var weight = WEIGHTS[key];

      totalWeight += weight;
      weightedSum += weight * subScore;

      // Delta vs baseline for the metric tiles.
      var deltaAbs = value - base.mean;
      var deltaPct = base.mean ? (deltaAbs / base.mean) * 100 : 0;
      // For resting HR, "down" is the good direction.
      var goodDirection = key === 'restingHR' ? deltaAbs < 0 : deltaAbs > 0;
      if (key === 'respiratoryRate') goodDirection = Math.abs(deltaAbs) < base.std;

      metricDetails[key] = {
        value: value,
        baseline: base.mean,
        personal: base.personal,
        subScore: Math.round(subScore),
        deltaAbs: deltaAbs,
        deltaPct: deltaPct,
        good: goodDirection
      };

      contributions.push({ key: key, weight: weight, subScore: subScore });
    });

    if (totalWeight === 0) {
      return {
        score: null,
        band: bandFor(0),
        calibrating: baselines.calibrating,
        baselineDays: baselines.days,
        metrics: metricDetails,
        insufficient: true
      };
    }

    // Re-normalise so a missing metric doesn't drag the score down.
    var score = Math.round(weightedSum / totalWeight);

    return {
      score: score,
      band: bandFor(score),
      calibrating: baselines.calibrating,
      baselineDays: baselines.days,
      metrics: metricDetails,
      insufficient: false
    };
  }

  global.HealthApp = global.HealthApp || {};
  global.HealthApp.recovery = {
    computeRecovery: computeRecovery,
    computeBaselines: computeBaselines,
    bandFor: bandFor,
    WEIGHTS: WEIGHTS,
    SLEEP_NEED_HOURS: SLEEP_NEED_HOURS,
    MIN_HISTORY_DAYS: MIN_HISTORY_DAYS
  };
})(window);
