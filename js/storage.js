/*
 * storage.js — local, private storage for daily health records.
 *
 * Uses IndexedDB (keyed by date) with a localStorage fallback. Nothing ever
 * leaves the device — there is no server and no account. This keeps your
 * health data private by default.
 *
 * Attaches to window.HealthApp.storage
 */
(function (global) {
  'use strict';

  var DB_NAME = 'healthapp';
  var DB_VERSION = 1;
  var STORE = 'records';
  var LS_KEY = 'healthapp.records';

  var dbPromise = null;
  var useFallback = !global.indexedDB;

  function openDB() {
    if (useFallback) return Promise.reject(new Error('no-indexeddb'));
    if (dbPromise) return dbPromise;

    dbPromise = new Promise(function (resolve, reject) {
      var req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'date' });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    }).catch(function (err) {
      useFallback = true;
      throw err;
    });

    return dbPromise;
  }

  // --- localStorage fallback helpers ---
  function lsReadAll() {
    try {
      return JSON.parse(global.localStorage.getItem(LS_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }
  function lsWriteAll(map) {
    global.localStorage.setItem(LS_KEY, JSON.stringify(map));
  }

  function sortByDate(records) {
    return records.slice().sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    });
  }

  function putRecord(record) {
    if (!record || !record.date) {
      return Promise.reject(new Error('record needs a date'));
    }
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(record);
        tx.oncomplete = function () { resolve(record); };
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function () {
      var map = lsReadAll();
      map[record.date] = record;
      lsWriteAll(map);
      return record;
    });
  }

  function putMany(records) {
    return records.reduce(function (chain, rec) {
      return chain.then(function () { return putRecord(rec); });
    }, Promise.resolve());
  }

  function getAll() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var req = tx.objectStore(STORE).getAll();
        req.onsuccess = function () { resolve(sortByDate(req.result || [])); };
        req.onerror = function () { reject(req.error); };
      });
    }).catch(function () {
      var map = lsReadAll();
      return sortByDate(Object.keys(map).map(function (k) { return map[k]; }));
    });
  }

  function clearAll() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function () {
      lsWriteAll({});
      return undefined;
    });
  }

  global.HealthApp = global.HealthApp || {};
  global.HealthApp.storage = {
    putRecord: putRecord,
    putMany: putMany,
    getAll: getAll,
    clearAll: clearAll
  };
})(window);
