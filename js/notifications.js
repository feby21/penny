/* Penny – 2-day and same-day expiry alerts. */
(function (P) {
  'use strict';
  var U = P.util;
  var N = P.notifications = {};

  var TYPES = [
    { type: 'two_days', days: 2 },
    { type: 'today', days: 0 }
  ];

  // Creates at most one grouped notification per type, skipping any item already alerted for that type.
  N.check = function (silent) {
    var st = P.store.state;
    var today = P.store.today();
    var items = P.inventory.active();
    var created = [];
    TYPES.forEach(function (t) {
      var due = items.filter(function (i) {
        return P.inventory.daysLeft(i) === t.days && !st.alerted[i.id + ':' + t.type];
      });
      if (!due.length) return;
      var ids = due.map(function (i) { return i.id; });
      var names = due.map(function (i) { return i.name; });
      due.forEach(function (i) { st.alerted[i.id + ':' + t.type] = true; });
      // One grouped notification per type per day: new items join today's existing one.
      var n = st.notifications.find(function (x) { return x.type === t.type && x.date === today; });
      if (n) {
        n.itemIds = n.itemIds.concat(ids);
        n.itemNames = n.itemNames.concat(names);
        n.read = false;
        n.createdAt = Date.now() + created.length;
      } else {
        n = { id: U.uid('n'), type: t.type, date: today, read: false, createdAt: Date.now() + created.length, itemIds: ids, itemNames: names };
        st.notifications.push(n);
      }
      created.push({ type: t.type, itemNames: names });
    });
    if (created.length) {
      P.store.save();
      if (!silent) {
        created.forEach(function (n) {
          P.app.toast(N.title(n), n.type === 'today' ? 'today' : 'alert', n.type === 'today' ? '⏰' : '🔔', true);
        });
      }
    }
    return created;
  };

  N.title = function (n) {
    var c = n.itemNames.length;
    if (n.type === 'today') return c === 1 ? n.itemNames[0] + ' expires today' : c + ' items expire today';
    return c === 1 ? n.itemNames[0] + ' expires in 2 days' : c + ' items expire in 2 days';
  };
  N.body = function (n) {
    var lead = n.type === 'today' ? 'Use today: ' : 'Plan to use: ';
    return lead + U.list(n.itemNames) + '.';
  };
  N.unread = function () { return P.store.state.notifications.filter(function (n) { return !n.read; }).length; };

  N.render = function () {
    var list = P.store.state.notifications.slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    var html = '<div class="back-bar"><button type="button" class="link-btn" data-action="overlay-back">' + P.ICONS.back + ' Back</button></div>' +
      '<div class="page-head"><h1>Notifications</h1>' +
      (N.unread() ? '<button type="button" class="btn btn-small" data-action="notif-read-all">Mark all read</button>' : '') + '</div>' +
      '<p class="page-sub">Penny alerts you 2 days before food expires, and again on the day.</p>';
    if (!list.length) {
      return html + '<div class="card empty"><div class="empty-icon">🔕</div><strong>No alerts yet</strong>Move the demo date forward to see expiry alerts arrive.</div>';
    }
    html += list.map(function (n) {
      var isToday = n.type === 'today';
      return '<article class="notif' + (n.read ? '' : ' unread') + '">' +
        '<div class="alert-ico ' + (isToday ? 'today' : 'two') + '">' + (isToday ? '⏰' : '🔔') + '</div>' +
        '<div class="grow"><div class="notif-title">' + (n.read ? '' : '<span class="unread-dot" aria-label="Unread"></span>') + U.esc(N.title(n)) + '</div>' +
        '<div class="notif-body">' + U.esc(N.body(n)) + '</div>' +
        '<div class="notif-foot"><span>' + (isToday ? 'Expires today' : '2-day reminder') + ' · ' + U.fmtDay(n.date) + '</span>' +
        (n.read ? '<span>Read</span>' : '<button type="button" class="btn btn-small" data-action="notif-read" data-id="' + n.id + '">Mark as read</button>') +
        '</div></div></article>';
    }).join('');
    return html;
  };

  P.actions['open-notifications'] = function () { P.app.openOverlay({ type: 'notifications' }); };
  P.actions['notif-read'] = function (el) {
    var n = P.store.state.notifications.find(function (x) { return x.id === el.dataset.id; });
    if (n) n.read = true;
    P.store.save();
    P.app.render();
  };
  P.actions['notif-read-all'] = function () {
    P.store.state.notifications.forEach(function (n) { n.read = true; });
    P.store.save();
    P.app.render();
  };
})(window.Penny);
