/* Penny – simulated Nectar / Sainsbury's basket sync. */
(function (P) {
  'use strict';
  var U = P.util;
  var Y = P.sync = {};
  var SYNC_MS = 1600;

  Y.canScan = function () { return P.store.state.syncedDates.indexOf(P.store.today()) === -1; };

  Y.estimate = function (entry, today) {
    if (entry.rule) return { expiryDate: U.addDays(today, P.EXPIRY_RULES[entry.rule]), estimated: true, estimateRule: entry.rule };
    return { expiryDate: U.addDays(today, entry.packDays || 365), estimated: false };
  };

  Y.scan = function () {
    var st = P.store.state;
    if (P.app.ui.syncing) return;
    if (!st.user.nectarLinked) { Y.openConsent(); return; }
    if (!Y.canScan()) { P.app.toast('Already synced today. Move the demo date on to shop again.'); return; }

    P.app.ui.syncing = true;
    P.app.render();
    setTimeout(function () {
      var today = P.store.today();
      var total = 0;
      var newIds = [];
      P.SEED_BASKET.forEach(function (entry, i) {
        var est = Y.estimate(entry, today);
        var item = {
          id: 'nectar-' + today + '-' + (i + 1), name: entry.name, category: entry.category, storage: entry.storage,
          quantity: entry.quantity, unit: entry.unit, purchaseDate: today, expiryDate: est.expiryDate,
          dateType: entry.dateType, source: 'nectar', estimated: est.estimated, estimateRule: est.estimateRule,
          opened: false, used: false, price: entry.price
        };
        total += entry.price;
        newIds.push(item.id);
        st.items.push(item);
      });
      st.syncedDates.push(today);
      st.lastSync = { date: today, at: Date.now(), count: P.SEED_BASKET.length, total: Math.round(total * 100) / 100 };
      P.store.save();
      P.app.ui.syncing = false;
      P.app.ui.newIds = newIds;
      P.app.toast('Synced ' + P.SEED_BASKET.length + ' items from Sainsbury’s (' + U.money(total) + ')', 'success', '🛒');
      P.notifications.check();
      P.app.render();
    }, SYNC_MS);
  };

  Y.openConsent = function () {
    var html = '<p class="muted">Penny reads your itemised Sainsbury’s basket each time you scan your Nectar card, so you never have to log food by hand.</p>' +
      '<div class="card" style="margin-top:12px"><b>What Nectar shares with Penny</b><ul class="share-list">' +
      ['Product name and pack size', 'Quantity', 'Price paid', 'Purchase date'].map(function (s) {
        return '<li><span class="tick">✓</span>' + s + '</li>';
      }).join('') + '</ul></div>' +
      '<p class="small muted" style="margin:12px 0">Penny never sees your payment details. You can unlink at any time. (Demo: no real data is shared.)</p>' +
      '<button type="button" class="btn btn-primary btn-block" data-action="nectar-link-scan">Allow and link Nectar</button>';
    P.app.openSheet('Link your Nectar card', html);
  };

  Y.lastSyncText = function () {
    var ls = P.store.state.lastSync;
    if (!ls) return 'Not synced yet';
    var diff = U.diffDays(ls.date, P.store.today());
    var when = diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : diff > 1 ? U.plural(diff, 'day') + ' ago' : U.fmtDate(ls.date);
    return when + ' at ' + U.fmtTime(ls.at) + ' · ' + ls.count + ' items · ' + U.money(ls.total);
  };

  P.actions['nectar-scan'] = function () { Y.scan(); };
  P.actions['nectar-link-scan'] = function () {
    P.store.state.user.nectarLinked = true;
    P.store.save();
    P.app.closeSheet();
    P.app.toast('Nectar linked', 'success');
    Y.scan();
  };
})(window.Penny);
