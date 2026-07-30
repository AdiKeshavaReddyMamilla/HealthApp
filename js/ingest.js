/*
 * ingest.js — get data into the app.
 *
 * Primary path: the Apple Shortcut opens the app with the day's metrics encoded
 * in the URL, e.g.  .../#data=<base64 JSON>. We decode, validate, and persist.
 *
 * Fallbacks: paste raw JSON, or load realistic sample data so you can see the
 * whole app working before wiring up your real Apple Watch data.
 *
 * Attaches to window.HealthApp.ingest
 */
(function (global) {
  'use strict';

  // The Shortcut may use friendlier key names; map them all to our schema.
  var ALIASES = {
    hrv: 'hrv',
    heartratevariability: 'hrv',
    hrv_sdnn: 'hrv',
    sdnn: 'hrv',
    restinghr: 'restingHR',
    restingheartrate: 'restingHR',
    resting_hr: 'restingHR',
    rhr: 'restingHR',
    sleephours: 'sleepHours',
    sleep: 'sleepHours',
    sleep_hours: 'sleepHours',
    respiratoryrate: 'respiratoryRate',
    respiratory_rate: 'respiratoryRate',
    breathingrate: 'respiratoryRate',
    rr: 'respiratoryRate',
    spo2: 'spo2',
    bloodoxygen: 'spo2',
    date: 'date'
  };

  var NUMERIC_FIELDS = ['hrv', 'restingHR', 'sleepHours', 'respiratoryRate', 'spo2'];

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function decodeBase64Json(str) {
    // Accept URL-safe base64 and restore padding.
    var b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var binary = global.atob(b64);
    // Decode as UTF-8.
    var json = decodeURIComponent(
      binary.split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join('')
    );
    return JSON.parse(json);
  }

  // Turn an arbitrary object from the Shortcut into a clean record.
  function normalizeRecord(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var out = {};

    Object.keys(raw).forEach(function (rawKey) {
      var canonical = ALIASES[rawKey.toLowerCase().replace(/\s+/g, '')];
      if (!canonical) return;
      out[canonical] = raw[rawKey];
    });

    NUMERIC_FIELDS.forEach(function (f) {
      if (out[f] !== undefined && out[f] !== null && out[f] !== '') {
        var n = parseFloat(out[f]);
        out[f] = isNaN(n) ? undefined : Math.round(n * 100) / 100;
      } else {
        delete out[f];
      }
    });

    // Sleep sometimes arrives in minutes — convert anything implausibly large.
    if (typeof out.sleepHours === 'number' && out.sleepHours > 24) {
      out.sleepHours = Math.round((out.sleepHours / 60) * 100) / 100;
    }

    if (!out.date || !/^\d{4}-\d{2}-\d{2}$/.test(out.date)) {
      out.date = todayISO();
    }
    out.source = raw.source || 'shortcut';

    var hasMetric = NUMERIC_FIELDS.some(function (f) {
      return typeof out[f] === 'number';
    });
    return hasMetric ? out : null;
  }

  // Accept a single record, an array of records, or { records: [...] }.
  function normalizePayload(parsed) {
    var list = Array.isArray(parsed) ? parsed
      : (parsed && Array.isArray(parsed.records)) ? parsed.records
      : [parsed];
    return list.map(normalizeRecord).filter(Boolean);
  }

  // Read (and clear) any #data= payload from the URL. Returns [] if none.
  function readFromHash() {
    var hash = global.location.hash || '';
    var match = hash.match(/[#&]data=([^&]+)/);
    if (!match) return [];
    try {
      var parsed = decodeBase64Json(decodeURIComponent(match[1]));
      return normalizePayload(parsed);
    } catch (e) {
      try {
        // Maybe it was plain (not base64) JSON in the URL.
        return normalizePayload(JSON.parse(decodeURIComponent(match[1])));
      } catch (e2) {
        console.warn('Could not parse #data= payload:', e2);
        return [];
      }
    }
  }

  function clearHash() {
    if (global.history && global.history.replaceState) {
      global.history.replaceState(null, '', global.location.pathname + global.location.search);
    } else {
      global.location.hash = '';
    }
  }

  function parseText(text) {
    return normalizePayload(JSON.parse(text));
  }

  // --- Sample data so the app is explorable immediately -------------------

  function seededRandom(seed) {
    var s = seed;
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  // Generate ~35 days of realistic, gently-varying data with a couple of
  // low-recovery "hard days" so the score visibly moves.
  function generateSample(days) {
    days = days || 35;
    var rnd = seededRandom(1234);
    var out = [];
    var base = new Date();
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(base);
      d.setDate(base.getDate() - i);
      var iso = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');

      var hard = (i === 2 || i === 9 || i === 18); // occasional rough nights
      var hrv = 55 + (rnd() - 0.5) * 18 - (hard ? 18 : 0);
      var rhr = 55 + (rnd() - 0.5) * 6 + (hard ? 7 : 0);
      var sleep = 7.4 + (rnd() - 0.5) * 1.6 - (hard ? 1.8 : 0);
      var rr = 14 + (rnd() - 0.5) * 1.5 + (hard ? 1.2 : 0);

      out.push({
        date: iso,
        hrv: Math.round(Math.max(20, hrv)),
        restingHR: Math.round(Math.max(40, rhr)),
        sleepHours: Math.round(Math.max(3, sleep) * 10) / 10,
        respiratoryRate: Math.round(Math.max(9, rr) * 10) / 10,
        source: 'sample'
      });
    }
    return out;
  }

  global.HealthApp = global.HealthApp || {};
  global.HealthApp.ingest = {
    readFromHash: readFromHash,
    clearHash: clearHash,
    parseText: parseText,
    normalizeRecord: normalizeRecord,
    normalizePayload: normalizePayload,
    generateSample: generateSample,
    todayISO: todayISO
  };
})(window);
