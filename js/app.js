/*
 * app.js — wiring & rendering for the Health & Recovery PWA.
 *
 * Flow on load:
 *   1. Ingest any #data= payload the Apple Shortcut passed in the URL.
 *   2. Persist it locally, then load the full history.
 *   3. Compute recovery for the latest day and render the morning summary,
 *      the recovery ring, the metric tiles, and 7/14-day trend charts.
 */
(function (global) {
  'use strict';

  var HA = global.HealthApp;
  var $ = function (sel) { return document.querySelector(sel); };

  var METRIC_META = {
    hrv:             { label: 'Heart Rate Variability', unit: 'ms',     color: '#4fd1ff' },
    restingHR:       { label: 'Resting Heart Rate',     unit: 'bpm',    color: '#ff5c72' },
    sleepHours:      { label: 'Sleep',                  unit: 'h',      color: '#a78bfa' },
    respiratoryRate: { label: 'Respiratory Rate',       unit: 'br/min', color: '#22e39b' }
  };

  var state = { history: [], today: null, recovery: null };

  // ---- Rendering -----------------------------------------------------------

  function renderSummary(summary) {
    $('#greeting').textContent = summary.greeting;
    $('#summary-headline').textContent = summary.headline;
    $('#summary-advice').textContent = summary.advice;

    var linesEl = $('#summary-lines');
    linesEl.innerHTML = '';
    summary.lines.forEach(function (line) {
      var li = document.createElement('li');
      li.textContent = line;
      linesEl.appendChild(li);
    });
  }

  function renderRing(recovery) {
    var ring = $('#recovery-ring');
    var scoreEl = $('#recovery-score');
    var bandEl = $('#recovery-band');
    var calib = $('#calibrating-badge');

    if (!recovery || recovery.insufficient || recovery.score === null) {
      scoreEl.textContent = '--';
      bandEl.textContent = 'No data';
      bandEl.style.color = '#7c8a99';
      ring.style.setProperty('--pct', '0');
      ring.style.setProperty('--ring-color', '#3a4553');
      calib.hidden = true;
      return;
    }

    var color = recovery.band.color;
    scoreEl.textContent = recovery.score;
    bandEl.textContent = recovery.band.label;
    bandEl.style.color = color;
    ring.style.setProperty('--pct', String(recovery.score));
    ring.style.setProperty('--ring-color', color);
    calib.hidden = !recovery.calibrating;
  }

  function deltaChip(detail, key) {
    if (!detail) return '';
    var cls = detail.good ? 'chip up' : 'chip down';
    var arrow = detail.good ? '▲' : '▼';
    var text;
    if (key === 'restingHR') {
      text = Math.abs(Math.round(detail.deltaAbs)) + ' bpm';
    } else if (key === 'sleepHours') {
      text = (detail.deltaAbs >= 0 ? '+' : '') + detail.deltaAbs.toFixed(1) + 'h';
    } else {
      text = Math.abs(Math.round(detail.deltaPct)) + '%';
    }
    return '<span class="' + cls + '">' + arrow + ' ' + text + '</span>';
  }

  function renderTiles(recovery, history) {
    var container = $('#metric-tiles');
    container.innerHTML = '';
    var recent = history.slice(-14);

    Object.keys(METRIC_META).forEach(function (key) {
      var meta = METRIC_META[key];
      var detail = recovery && recovery.metrics ? recovery.metrics[key] : null;
      var series = recent.map(function (r) { return r[key]; });

      var valueText = '—';
      if (detail && typeof detail.value === 'number') {
        valueText = key === 'sleepHours'
          ? HA.summary.fmtHours(detail.value)
          : (Math.round(detail.value * 10) / 10);
      }

      var tile = document.createElement('div');
      tile.className = 'tile';
      tile.innerHTML =
        '<div class="tile-head">' +
          '<span class="tile-label">' + meta.label + '</span>' +
          deltaChip(detail, key) +
        '</div>' +
        '<div class="tile-value" style="color:' + meta.color + '">' +
          valueText + (key === 'sleepHours' ? '' :
            ' <span class="unit">' + meta.unit + '</span>') +
        '</div>' +
        '<div class="tile-chart">' +
          HA.charts.sparkline(series, { color: meta.color, id: 'spark-' + key }) +
        '</div>' +
        '<div class="tile-sub">' +
          (detail ? 'baseline ' +
            (key === 'sleepHours' ? HA.summary.fmtHours(detail.baseline)
              : Math.round(detail.baseline)) +
            (detail.personal ? '' : ' (default)') : 'no reading') +
        '</div>';
      container.appendChild(tile);
    });
  }

  function renderSourceNote() {
    var note = $('#source-note');
    if (!state.today) { note.textContent = ''; return; }
    var when = state.today.date;
    var src = state.today.source === 'sample' ? 'sample data'
      : state.today.source === 'shortcut' ? 'Apple Watch (Shortcut)'
      : state.today.source || 'imported';
    note.textContent = 'Latest: ' + when + ' · ' + src +
      ' · ' + state.history.length + ' day' + (state.history.length === 1 ? '' : 's') + ' stored';
  }

  function renderAll() {
    state.today = state.history.length
      ? state.history[state.history.length - 1] : null;
    state.recovery = HA.recovery.computeRecovery(state.today, state.history);
    var summary = HA.summary.build(state.today, state.recovery);

    renderSummary(summary);
    renderRing(state.recovery);
    renderTiles(state.recovery, state.history);
    renderSourceNote();
  }

  function reload() {
    return HA.storage.getAll().then(function (all) {
      state.history = all;
      renderAll();
      return all;
    });
  }

  // ---- Actions -------------------------------------------------------------

  function ingestFromHash() {
    var records = HA.ingest.readFromHash();
    if (!records.length) return Promise.resolve(false);
    HA.ingest.clearHash();
    return HA.storage.putMany(records).then(function () {
      toast(records.length + ' reading' + (records.length === 1 ? '' : 's') + ' imported');
      return true;
    });
  }

  function loadSample() {
    return HA.storage.putMany(HA.ingest.generateSample(35))
      .then(reload)
      .then(function () { toast('Sample data loaded'); });
  }

  function applyImport() {
    var text = $('#import-text').value.trim();
    if (!text) return;
    try {
      var records = HA.ingest.parseText(text);
      if (!records.length) { toast('No valid readings found', true); return; }
      HA.storage.putMany(records).then(reload).then(function () {
        closeDialog();
        toast(records.length + ' reading' + (records.length === 1 ? '' : 's') + ' imported');
      });
    } catch (e) {
      toast('Could not read that JSON', true);
    }
  }

  function clearData() {
    if (!global.confirm('Delete all stored health data on this device?')) return;
    HA.storage.clearAll().then(reload).then(function () { toast('All data cleared'); });
  }

  // ---- UI helpers ----------------------------------------------------------

  var toastTimer = null;
  function toast(msg, isError) {
    var el = $('#toast');
    el.textContent = msg;
    el.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast'; }, 2600);
  }

  function openDialog() { $('#import-dialog').hidden = false; }
  function closeDialog() { $('#import-dialog').hidden = true; }

  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* offline nicety only */ });
    }
  }

  // ---- Boot ----------------------------------------------------------------

  function boot() {
    $('#btn-sample').addEventListener('click', loadSample);
    $('#btn-import').addEventListener('click', openDialog);
    $('#btn-clear').addEventListener('click', clearData);
    $('#import-apply').addEventListener('click', applyImport);
    $('#import-close').addEventListener('click', closeDialog);
    $('#year').textContent = new Date().getFullYear();

    // When Pulse is already open and the morning Shortcut re-opens it with a new
    // #… payload, the browser doesn't reload — so re-ingest on hash changes.
    global.addEventListener('hashchange', function () {
      ingestFromHash().then(function (changed) { if (changed) reload(); });
    });

    ingestFromHash()
      .then(reload)
      .then(registerSW);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
