/* Penny – inventory: status, filters, add / edit / mark used / delete. */
(function (P) {
  'use strict';
  var U = P.util;
  var I = P.inventory = {};

  I.daysLeft = function (item) { return U.diffDays(P.store.today(), item.expiryDate); };
  I.status = function (item) {
    var d = I.daysLeft(item);
    if (d < 0) return 'expired';
    if (d <= 2) return 'soon';
    return 'fresh';
  };
  I.STATUS_LABEL = { fresh: 'Fresh', soon: 'Use soon', expired: 'Expired' };
  I.daysText = function (d) {
    if (d < -1) return 'Expired ' + (-d) + ' days ago';
    if (d === -1) return 'Expired yesterday';
    if (d === 0) return 'Expires today';
    if (d === 1) return '1 day left';
    return d + ' days left';
  };
  I.active = function () { return P.store.state.items.filter(function (i) { return !i.used; }); };
  I.get = function (id) { return P.store.state.items.find(function (i) { return i.id === id; }); };

  // "Low quantity" thresholds feed the meal-plan score.
  I.isLow = function (item) {
    var q = Number(item.quantity) || 0;
    if (item.unit === 'g' || item.unit === 'ml') return q <= 150;
    if (item.unit === 'kg' || item.unit === 'L') return q <= 0.5;
    return q <= 1;
  };
  I.qtyText = function (item) { return (item.quantity === '' || item.quantity == null ? '' : item.quantity + ' ') + (item.unit || ''); };
  I.chip = function (item) {
    var s = I.status(item);
    return '<span class="chip chip-' + s + '">' + I.STATUS_LABEL[s] + '</span>';
  };
  I.sourceTag = function (item) {
    return item.source === 'nectar' ? '<span class="tag tag-nectar">Nectar</span>' : '<span class="tag tag-manual">Manual</span>';
  };

  function sortByExpiry(a, b) { return a.expiryDate < b.expiryDate ? -1 : a.expiryDate > b.expiryDate ? 1 : 0; }

  I.row = function (item) {
    var d = I.daysLeft(item);
    var isNew = P.app.ui.newIds && P.app.ui.newIds.indexOf(item.id) !== -1;
    return '<button type="button" class="item-row' + (isNew ? ' is-new' : '') + '" data-action="inv-open" data-id="' + item.id + '">' +
      '<div class="item-main"><div class="item-name">' + U.esc(item.name) + '</div>' +
      '<div class="item-meta"><span>' + U.esc(I.qtyText(item)) + ' · ' + U.esc(item.storage) + '</span>' + I.sourceTag(item) +
      (item.opened ? '<span class="tag">Opened</span>' : '') + '</div></div>' +
      '<div class="item-side">' + I.chip(item) +
      '<div class="item-days">' + I.daysText(d) + (item.estimated ? ' · est.' : '') + '</div></div>' +
      '</button>';
  };

  I.render = function () {
    var ui = P.app.ui;
    var items = I.active();
    var counts = { fresh: 0, soon: 0, expired: 0 };
    items.forEach(function (i) { counts[I.status(i)]++; });
    var shown = ui.invFilter === 'All' ? items : items.filter(function (i) { return i.storage === ui.invFilter; });

    var html = '<div class="page-head"><h1>Inventory</h1>' +
      '<button type="button" class="btn btn-primary btn-small" data-action="inv-add">+ Add item</button></div>' +
      '<div class="summary">' +
      '<div class="s-fresh"><b>' + counts.fresh + '</b><span>Fresh</span></div>' +
      '<div class="s-soon"><b>' + counts.soon + '</b><span>Use soon</span></div>' +
      '<div class="s-expired"><b>' + counts.expired + '</b><span>Expired</span></div></div>' +
      '<div class="filter-row" role="group" aria-label="Filter by storage">' +
      ['All'].concat(P.STORAGE).map(function (f) {
        return '<button type="button" class="filter-chip' + (ui.invFilter === f ? ' on' : '') + '" data-action="inv-filter" data-value="' + f + '" aria-pressed="' + (ui.invFilter === f) + '">' + f + '</button>';
      }).join('') + '</div>';

    if (!shown.length) {
      html += '<div class="card empty"><strong>' +
        (items.length ? 'Nothing in the ' + ui.invFilter.toLowerCase() : 'Your kitchen is empty') + '</strong>' +
        (items.length ? 'Try another storage filter.' : 'Scan your Nectar card on Home or add an item by hand.') + '</div>';
      return html;
    }

    var cats = P.CATEGORIES.slice();
    shown.forEach(function (i) { if (cats.indexOf(i.category) === -1) cats.push(i.category); });
    cats.forEach(function (cat) {
      var group = shown.filter(function (i) { return i.category === cat; }).sort(sortByExpiry);
      if (!group.length) return;
      html += '<div class="cat-group"><h3>' + U.esc(cat) +
        ' <span class="muted">(' + group.length + ')</span></h3><div class="cat-list">' + group.map(I.row).join('') + '</div></div>';
    });
    return html;
  };

  /* ---------- Item detail sheet ---------- */
  I.openItem = function (id) {
    var item = I.get(id);
    if (!item) return;
    var d = I.daysLeft(item);
    var dateLabel = item.dateType === 'use-by' ? 'Use by' : 'Best before';
    var note = '';
    if (item.estimated) {
      note += '<div class="note note-amber"><b>Estimated date.</b> Penny guessed this from the product type (' + U.esc(item.estimateRule) +
        ': ' + P.EXPIRY_RULES[item.estimateRule] + ' days). Check the pack and edit it if it’s different.</div>';
    }
    if (item.dateType === 'use-by' && d < 0) {
      note += '<div class="note note-red">This was a use-by date. For safety, don’t eat it after that date, even if it looks fine.</div>';
    } else if (item.dateType === 'best-before' && d < 0) {
      note += '<div class="note">Best-before is about quality, not safety. Check it looks and smells fine before using.</div>';
    }
    var html = '<div class="dl">' +
      '<div><dt>Status</dt><dd>' + I.chip(item) + ' <span class="small muted">' + I.daysText(d) + '</span></dd></div>' +
      '<div><dt>' + dateLabel + '</dt><dd>' + U.fmtDay(item.expiryDate) + (item.estimated ? ' <span class="tag tag-est">estimated</span>' : '') + '</dd></div>' +
      '<div><dt>Quantity</dt><dd>' + U.esc(I.qtyText(item)) + (item.opened ? ' · opened' : '') + '</dd></div>' +
      '<div><dt>Storage</dt><dd>' + U.esc(item.storage) + '</dd></div>' +
      '<div><dt>Category</dt><dd>' + U.esc(item.category) + '</dd></div>' +
      '<div><dt>Source</dt><dd>' + (item.source === 'nectar' ? 'Nectar sync' : 'Added by hand') + ' · ' + U.fmtDate(item.purchaseDate) + '</dd></div>' +
      '</div>' + note +
      '<div class="btn-row">' +
      '<button type="button" class="btn btn-primary" data-action="inv-used" data-id="' + item.id + '">✓ Mark used</button>' +
      '<button type="button" class="btn" data-action="inv-edit" data-id="' + item.id + '">Edit</button>' +
      '<button type="button" class="btn btn-danger" data-action="inv-delete" data-id="' + item.id + '" data-confirm="Tap again to delete">Delete</button>' +
      '</div>';
    P.app.openSheet(U.esc(item.name), html);
  };

  /* ---------- Add / edit form ---------- */
  function options(list, selected) {
    return list.map(function (o) {
      var v = typeof o === 'string' ? o : o.value;
      var l = typeof o === 'string' ? o : o.label;
      return '<option value="' + U.esc(v) + '"' + (v === selected ? ' selected' : '') + '>' + U.esc(l) + '</option>';
    }).join('');
  }

  I.openForm = function (id) {
    var item = id ? I.get(id) : null;
    var today = P.store.today();
    var v = item || { name: '', category: 'Fruit & veg', quantity: 1, unit: 'pcs', storage: 'Fridge', expiryDate: U.addDays(today, 7), dateType: 'best-before', opened: false };
    var html = '<form class="form" data-form="item" novalidate>' +
      '<input type="hidden" name="id" value="' + (item ? item.id : '') + '">' +
      '<div class="field"><label for="f-name">Name</label><input id="f-name" name="name" required maxlength="60" placeholder="e.g. Cheddar" value="' + U.esc(v.name) + '"></div>' +
      '<div class="field-row">' +
      '<div class="field"><label for="f-cat">Category</label><select id="f-cat" name="category">' + options(P.CATEGORIES, v.category) + '</select></div>' +
      '<div class="field"><label for="f-storage">Storage</label><select id="f-storage" name="storage">' + options(P.STORAGE, v.storage) + '</select></div>' +
      '</div><div class="field-row">' +
      '<div class="field"><label for="f-qty">Quantity</label><input id="f-qty" name="quantity" type="number" min="0" step="any" inputmode="decimal" value="' + U.esc(v.quantity) + '"></div>' +
      '<div class="field"><label for="f-unit">Unit</label><select id="f-unit" name="unit">' + options(P.UNITS, v.unit) + '</select></div>' +
      '</div><div class="field-row">' +
      '<div class="field"><label for="f-exp">Expiry date</label><input id="f-exp" name="expiryDate" type="date" required value="' + U.esc(v.expiryDate) + '"></div>' +
      '<div class="field"><label for="f-dt">Date type</label><select id="f-dt" name="dateType">' +
      options([{ value: 'use-by', label: 'Use by' }, { value: 'best-before', label: 'Best before' }], v.dateType) + '</select></div>' +
      '</div>' +
      '<label class="check"><input type="checkbox" name="opened"' + (v.opened ? ' checked' : '') + '> Opened</label>' +
      '<p class="form-error" data-error hidden></p>' +
      '<button type="submit" class="btn btn-primary btn-block">' + (item ? 'Save changes' : 'Add to inventory') + '</button>' +
      '</form>';
    P.app.openSheet(item ? 'Edit item' : 'Add item', html);
  };

  P.forms.item = function (form) {
    var f = form.elements;
    var name = f.name.value.trim();
    var expiry = f.expiryDate.value;
    var err = form.querySelector('[data-error]');
    if (!name || !U.isDate(expiry)) {
      err.textContent = !name ? 'Please give the item a name.' : 'Please choose an expiry date.';
      err.hidden = false;
      return;
    }
    var st = P.store.state;
    var data = {
      name: name, category: f.category.value, storage: f.storage.value,
      quantity: f.quantity.value === '' ? '' : Number(f.quantity.value), unit: f.unit.value,
      expiryDate: expiry, dateType: f.dateType.value, opened: f.opened.checked
    };
    var id = f.id.value;
    if (id) {
      var item = I.get(id);
      if (item.expiryDate !== expiry) item.estimated = false; // user confirmed the real date
      Object.assign(item, data);
      P.app.toast('Saved ' + name, 'success');
    } else {
      var newItem = Object.assign({ id: U.uid('item'), purchaseDate: P.store.today(), source: 'manual', estimated: false, used: false }, data);
      st.items.push(newItem);
      P.app.ui.newIds = [newItem.id];
      P.app.toast('Added ' + name + ' to your inventory', 'success');
    }
    P.store.save();
    P.app.closeSheet();
    P.notifications.check();
    P.app.render();
  };

  /* ---------- Actions ---------- */
  P.actions['inv-filter'] = function (el) { P.app.ui.invFilter = el.dataset.value; P.app.render(); };
  P.actions['inv-open'] = function (el) { I.openItem(el.dataset.id); };
  P.actions['inv-add'] = function () { I.openForm(null); };
  P.actions['inv-edit'] = function (el) { I.openForm(el.dataset.id); };
  P.actions['inv-used'] = function (el) {
    var item = I.get(el.dataset.id);
    if (!item) return;
    item.used = true;
    item.usedOn = P.store.today();
    P.store.save();
    P.app.closeSheet();
    P.app.toast(item.name + ' marked as used. Nice one!', 'success');
    P.app.render();
  };
  P.actions['inv-delete'] = function (el) {
    var st = P.store.state;
    var item = I.get(el.dataset.id);
    if (!item) return;
    st.items = st.items.filter(function (i) { return i.id !== item.id; });
    P.store.save();
    P.app.closeSheet();
    P.app.toast('Deleted ' + item.name);
    P.app.render();
  };
})(window.Penny);
