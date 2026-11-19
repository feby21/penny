/* Penny – utilities and localStorage store. */
(function (P) {
  'use strict';

  /* ---------- Utilities ---------- */
  var U = P.util = {};
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  U.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  U.realToday = function () {
    var d = new Date();
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
  };
  // Dates are 'YYYY-MM-DD' strings; arithmetic is done in UTC so daylight saving never shifts a day.
  U.parse = function (s) { var p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]); };
  U.isDate = function (s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(U.parse(s)); };
  U.addDays = function (s, n) {
    var d = new Date(U.parse(s) + n * 86400000);
    return d.getUTCFullYear() + '-' + U.pad(d.getUTCMonth() + 1) + '-' + U.pad(d.getUTCDate());
  };
  U.diffDays = function (a, b) { return Math.round((U.parse(b) - U.parse(a)) / 86400000); };
  U.fmtDate = function (s) { var d = new Date(U.parse(s)); return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()]; };
  U.fmtDay = function (s) { var d = new Date(U.parse(s)); return DAYS[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()]; };
  U.fmtLong = function (s) { var d = new Date(U.parse(s)); return DAYS_LONG[d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTHS_LONG[d.getUTCMonth()]; };
  U.fmtTime = function (ts) { var d = new Date(ts); return U.pad(d.getHours()) + ':' + U.pad(d.getMinutes()); };
  U.timeAgo = function (ts) {
    var m = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    var h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    var d = Math.round(h / 24);
    return d === 1 ? 'yesterday' : d + 'd ago';
  };
  U.money = function (n) { return '£' + (Math.round(n * 100) / 100).toFixed(2); };
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  U.uid = function (prefix) { return (prefix || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  U.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  U.norm = function (s) { return String(s || '').toLowerCase().trim(); };
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  // True when `term` appears in `text` at the start of a word ("egg" matches "Eggs", "peas" does not match "chickpeas").
  U.wordStart = function (term, text) {
    term = U.norm(term); text = U.norm(text);
    if (!term) return false;
    return new RegExp('(^|[^a-z])' + escRe(term)).test(text);
  };
  U.hasAnyWord = function (text, words) {
    return words.some(function (w) { return U.wordStart(w, text); });
  };
  U.plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); };
  U.list = function (arr) {
    if (arr.length <= 1) return arr.join('');
    return arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
  };

  /* ---------- Store ---------- */
  var KEY = 'penny-demo-v1';
  var VERSION = 1;
  var S = P.store = { state: null };

  S.createSeed = function () {
    var today = U.realToday();
    var now = Date.now();
    var items = P.SEED_INVENTORY.map(function (r, i) {
      return {
        id: 'item-' + (i + 1), name: r[0], category: r[1], storage: r[2], quantity: r[3], unit: r[4],
        purchaseDate: U.addDays(today, -r[8]), expiryDate: U.addDays(today, r[5]), dateType: r[6],
        opened: r[7], source: 'manual', estimated: false, used: false
      };
    });
    var recipes = P.SEED_RECIPES.map(function (r) {
      var c = U.clone(r);
      c.createdAt = now - c.hoursAgo * 3600000;
      delete c.hoursAgo;
      return S.applyTags(c);
    });
    var comments = P.SEED_COMMENTS.map(function (c, i) {
      return { id: 'cm-' + (i + 1), recipeId: c.recipeId, authorId: c.authorId, text: c.text, createdAt: now - c.minutesAgo * 60000 };
    });
    var events = S.seedEvents(today, now);
    comments = comments.concat(S.seedEventComments(now));
    return {
      version: VERSION,
      events: events,
      demoDate: today,
      user: { id: 'me', name: '', diet: 'none', allergies: [], nectarLinked: false, reciMeLinked: false, onboarded: false },
      users: U.clone(P.SEED_USERS),
      items: items,
      recipes: recipes,
      comments: comments,
      notifications: [],
      alerted: {},          // "itemId:type" -> true, so the same alert is never created twice
      syncedDates: [],      // demo dates on which the Nectar scan has run
      lastSync: null,
      saved: [],            // community recipe ids saved by the user
      plan: { date: today, skip: [] },
      cooked: []
    };
  };

  S.applyTags = function (r) {
    var t = P.RECIPE_TAGS[r.id];
    if (t && r.cuisine === undefined) Object.assign(r, U.clone(t));
    return r;
  };

  S.seedEvents = function (startDate, now) {
    return P.SEED_EVENTS.map(function (e) {
      var c = U.clone(e);
      var d = U.addDays(startDate, c.minOffset || 1);
      while (new Date(U.parse(d)).getUTCDay() !== c.weekday) d = U.addDays(d, 1);
      c.date = d;
      c.createdAt = now - c.hoursAgo * 3600000;
      delete c.weekday; delete c.minOffset; delete c.hoursAgo;
      return c;
    });
  };
  S.seedEventComments = function (now) {
    return P.SEED_EVENT_COMMENTS.map(function (c, i) {
      return { id: 'cm-e' + (i + 1), recipeId: c.recipeId, authorId: c.authorId, text: c.text, createdAt: now - c.minutesAgo * 60000 };
    });
  };

  S.load = function () {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === VERSION) {
          S.state = parsed;
          // Saved demos from before events existed: add them without wiping progress.
          if (!parsed.events) {
            parsed.events = S.seedEvents(parsed.demoDate, Date.now());
            parsed.comments = parsed.comments.concat(S.seedEventComments(Date.now()));
            S.save();
          }
          // Saved demos from before recipe tags existed: tag the seed recipes.
          parsed.recipes.forEach(S.applyTags);
          return;
        }
      }
    } catch (e) { /* storage unavailable or corrupt: fall back to seed */ }
    S.state = S.createSeed();
    S.save();
  };

  S.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(S.state)); } catch (e) { /* ignore quota / privacy mode */ }
  };

  S.reset = function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    location.reload();
  };

  S.today = function () { return S.state.demoDate; };
})(window.Penny);
