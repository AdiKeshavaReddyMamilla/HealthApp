/*
 * charts.js — tiny, dependency-free SVG charts (works offline, no CDN).
 *
 * Attaches to window.HealthApp.charts
 */
(function (global) {
  'use strict';

  function extent(values) {
    var min = Infinity, max = -Infinity;
    values.forEach(function (v) {
      if (typeof v !== 'number' || isNaN(v)) return;
      if (v < min) min = v;
      if (v > max) max = v;
    });
    if (min === Infinity) { min = 0; max = 1; }
    if (min === max) { min -= 1; max += 1; }
    return { min: min, max: max };
  }

  /*
   * Sparkline with a gradient fill and an end dot. Values are oldest→newest.
   * opts: { width, height, color, id }
   */
  function sparkline(values, opts) {
    opts = opts || {};
    var w = opts.width || 240;
    var h = opts.height || 64;
    var pad = 6;
    var color = opts.color || '#4fd1ff';
    var id = opts.id || ('g' + Math.random().toString(36).slice(2));

    var pts = values.filter(function (v) {
      return typeof v === 'number' && !isNaN(v);
    });
    if (pts.length < 2) {
      return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h +
        '" preserveAspectRatio="none"><text x="' + (w / 2) + '" y="' + (h / 2) +
        '" fill="#7c8a99" font-size="11" text-anchor="middle">not enough data</text></svg>';
    }

    var ext = extent(pts);
    var span = ext.max - ext.min;
    var stepX = (w - pad * 2) / (pts.length - 1);

    function x(i) { return pad + i * stepX; }
    function y(v) { return pad + (h - pad * 2) * (1 - (v - ext.min) / span); }

    var line = pts.map(function (v, i) {
      return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(v).toFixed(1);
    }).join(' ');

    var area = line + ' L' + x(pts.length - 1).toFixed(1) + ' ' + (h - pad) +
      ' L' + x(0).toFixed(1) + ' ' + (h - pad) + ' Z';

    var lastX = x(pts.length - 1);
    var lastY = y(pts[pts.length - 1]);

    return '' +
      '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h +
        '" preserveAspectRatio="none" role="img">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.35"/>' +
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#' + id + ')"/>' +
      '<path d="' + line + '" fill="none" stroke="' + color +
        '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + lastX.toFixed(1) + '" cy="' + lastY.toFixed(1) +
        '" r="3.5" fill="' + color + '"/>' +
      '</svg>';
  }

  global.HealthApp = global.HealthApp || {};
  global.HealthApp.charts = { sparkline: sparkline };
})(window);
