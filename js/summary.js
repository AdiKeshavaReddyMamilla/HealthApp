/*
 * summary.js — turns today's numbers + recovery into a friendly morning brief.
 *
 * Attaches to window.HealthApp.summary
 */
(function (global) {
  'use strict';

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function fmtHours(h) {
    if (typeof h !== 'number') return '—';
    var hrs = Math.floor(h);
    var mins = Math.round((h - hrs) * 60);
    return hrs + 'h' + (mins ? ' ' + mins + 'm' : '');
  }

  function arrow(good) { return good ? '▲' : '▼'; }

  function pct(n) {
    var v = Math.round(Math.abs(n));
    return v + '%';
  }

  // Returns { greeting, headline, band, calibrating, lines[], advice }
  function build(today, recovery) {
    if (!today || !recovery || recovery.insufficient) {
      return {
        greeting: greeting(),
        headline: 'No data yet',
        band: null,
        calibrating: false,
        lines: ['Import your Apple Watch data (or load sample data) to see your recovery.'],
        advice: 'Set up the Shortcut in the docs to auto-import each morning.'
      };
    }

    var m = recovery.metrics;
    var lines = [];

    if (m.hrv) {
      lines.push('HRV ' + Math.round(m.hrv.value) + ' ms ' +
        arrow(m.hrv.good) + ' ' + pct(m.hrv.deltaPct) + ' vs baseline');
    }
    if (m.restingHR) {
      lines.push('Resting HR ' + Math.round(m.restingHR.value) + ' bpm ' +
        arrow(m.restingHR.good) + ' ' +
        Math.abs(Math.round(m.restingHR.deltaAbs)) + ' bpm');
    }
    if (m.sleepHours) {
      lines.push('Slept ' + fmtHours(m.sleepHours.value));
    }
    if (m.respiratoryRate) {
      lines.push('Respiratory rate ' + m.respiratoryRate.value.toFixed(1) + ' br/min');
    }

    var advice;
    var headline;
    switch (recovery.band.key) {
      case 'high':
        headline = "You're primed";
        advice = 'Your body is recovered — a great day to train hard or push your goals.';
        break;
      case 'medium':
        headline = 'Recovering';
        advice = 'Moderate recovery — keep intensity sensible and prioritise sleep tonight.';
        break;
      default:
        headline = 'Take it easy';
        advice = 'Low recovery — favour rest, light movement, hydration and an early night.';
    }

    if (recovery.calibrating) {
      advice = 'Still calibrating to your body (' + recovery.baselineDays +
        ' of ' + global.HealthApp.recovery.MIN_HISTORY_DAYS +
        ' days). Scores get sharper as more mornings come in. ' + advice;
    }

    return {
      greeting: greeting(),
      headline: headline,
      band: recovery.band,
      calibrating: recovery.calibrating,
      lines: lines,
      advice: advice
    };
  }

  global.HealthApp = global.HealthApp || {};
  global.HealthApp.summary = { build: build, fmtHours: fmtHours };
})(window);
