/* Penny – tab routing, header, Home, onboarding, sheets, toasts and event wiring. */
(function (P) {
  'use strict';
  var U = P.util;
  var A = P.app = {};
  var TABS = ['home', 'inventory', 'recipes', 'community', 'plans'];

  A.ui = {
    tab: 'home', overlay: null, invFilter: 'All', communitySort: 'newest', communityFilter: 'all',
    syncing: false, reciMeLoading: false, newIds: [],
    ob: { step: 0, diet: 'none', allergies: [], name: '' }
  };

  var $ = function (sel) { return document.querySelector(sel); };

  /* ---------- Toasts ---------- */
  A.toast = function (msg, kind, icon, opensNotifications) {
    var box = $('#toasts');
    var t = document.createElement('div');
    t.className = 'toast toast-' + (kind || 'info');
    t.innerHTML = (icon ? '<span class="t-ico">' + icon + '</span>' : '') + '<span>' + U.esc(msg) + '</span>';
    if (opensNotifications) {
      t.setAttribute('role', 'button');
      t.style.cursor = 'pointer';
      t.addEventListener('click', function () { A.openOverlay({ type: 'notifications' }); t.remove(); });
    }
    box.appendChild(t);
    while (box.children.length > 3) box.firstElementChild.remove();
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 300);
    }, 4200);
  };

  /* ---------- Bottom sheet ---------- */
  A.openSheet = function (title, html) {
    var sheet = $('#sheet');
    sheet.innerHTML = '<div class="sheet-grip"></div><div class="sheet-head"><h2>' + title + '</h2>' +
      '<button type="button" class="icon-btn" data-action="sheet-close" aria-label="Close">' + P.ICONS.close + '</button></div>' + html;
    sheet.scrollTop = 0;
    sheet.classList.add('open');
    sheet.setAttribute('aria-hidden', 'false');
    $('#sheet-backdrop').classList.add('open');
    var first = sheet.querySelector('input:not([type=hidden]), select, textarea');
    if (first && window.matchMedia('(pointer: fine)').matches) setTimeout(function () { first.focus(); }, 260);
  };
  A.closeSheet = function () {
    $('#sheet').classList.remove('open');
    $('#sheet').setAttribute('aria-hidden', 'true');
    $('#sheet-backdrop').classList.remove('open');
  };

  /* ---------- Routing ---------- */
  A.go = function (tab) {
    A.ui.tab = tab;
    A.ui.overlay = null;
    A.render();
    window.scrollTo(0, 0);
  };
  A.openOverlay = function (ov) {
    A.ui.overlay = ov;
    A.closeSheet();
    A.render();
    window.scrollTo(0, 0);
  };
  A.closeOverlay = function () { A.ui.overlay = null; A.render(); window.scrollTo(0, 0); };

  A.setDate = function (date) {
    var st = P.store.state;
    if (!U.isDate(date) || date === st.demoDate) return;
    st.demoDate = date;
    st.plan = { date: date, skip: [] };
    A.ui.newIds = [];
    P.store.save();
    P.notifications.check();
    A.render();
  };

  /* ---------- Home ---------- */
  function homeList(items, empty) {
    if (!items.length) return '<div class="empty compact">' + empty + '</div>';
    return '<ul class="mini-list">' + items.map(function (i) {
      return '<li><span><b>' + U.esc(i.name) + '</b> <span class="small muted">' + U.esc(i.storage) + (i.estimated ? ' · est.' : '') + '</span></span>' +
        P.inventory.sourceTag(i) + '</li>';
    }).join('') + '</ul>';
  }

  A.renderHome = function () {
    var st = P.store.state;
    var items = P.inventory.active();
    var dl = P.inventory.daysLeft;
    var todayItems = items.filter(function (i) { return dl(i) === 0; });
    var twoItems = items.filter(function (i) { return dl(i) === 2; });
    var oneItems = items.filter(function (i) { return dl(i) === 1; });
    var expired = items.filter(function (i) { return dl(i) < 0; });
    var name = st.user.name ? ', ' + U.esc(st.user.name) : '';
    var linked = st.user.nectarLinked;
    var canScan = P.sync.canScan();

    var btn;
    if (A.ui.syncing) {
      btn = '<button type="button" class="scan-btn" disabled aria-busy="true"><span class="scan-icon"><span class="spinner"></span></span>' +
        '<span style="flex:1"><strong>Syncing with Nectar…</strong><small>Fetching your Sainsbury’s basket</small><div class="progress"><span></span></div></span></button>';
    } else if (!canScan) {
      btn = '<button type="button" class="scan-btn" disabled><span class="scan-icon">✓</span><span><strong>Basket synced for ' + U.fmtDate(st.demoDate) + '</strong>' +
        '<small>Move the demo date on to shop again</small></span></button>';
    } else {
      btn = '<button type="button" class="scan-btn" data-action="nectar-scan"><span class="scan-icon">' + P.IMG.nectar() + '</span><span><strong>Scan Nectar card at Sainsbury’s</strong>' +
        '<small>' + (linked ? 'Your basket syncs to Penny automatically' : 'Link Nectar once, then your shop syncs itself') + '</small></span></button>';
    }

    var html = '<div class="hello"><h1>Hi' + name + ' 👋</h1><p>' + U.fmtLong(st.demoDate) + '</p></div>' + btn +
      '<div class="sync-meta"><span class="dot' + (st.lastSync ? '' : ' off') + '"></span>Last sync: ' + U.esc(P.sync.lastSyncText()) +
      (linked ? '' : ' · <span>Nectar not linked</span>') + '</div>';

    html += '<div class="card" style="margin-top:16px"><div class="card-head"><h2>' + P.IMG.alarm() + 'Expiring today</h2>' +
      '<span class="chip chip-' + (todayItems.length ? 'expired' : 'neutral') + '">' + todayItems.length + '</span></div>' +
      homeList(todayItems, 'Nothing expires today 🎉') + '</div>';
    html += '<div class="card"><div class="card-head"><h2>' + P.IMG.bell() + 'Expiring in 2 days</h2>' +
      '<span class="chip chip-' + (twoItems.length ? 'soon' : 'neutral') + '">' + twoItems.length + '</span></div>' +
      homeList(twoItems, 'Nothing due in 2 days.') +
      (oneItems.length ? '<p class="small muted" style="margin-top:8px">Also tomorrow: ' + U.esc(U.list(oneItems.map(function (i) { return i.name; }))) + '</p>' : '') + '</div>';

    if (expired.length) {
      html += '<button type="button" class="card note-red" style="display:block;width:100%;text-align:left;margin-top:12px;border-color:#F3C9C4" data-action="tab" data-tab="inventory">' +
        '<b>' + U.plural(expired.length, 'item') + ' expired.</b> Review them in your inventory →</button>';
    }

    var plan = P.mealplan.build();
    html += '<div class="section-title"><h2>Today’s suggested meal</h2><button type="button" class="link-btn" data-action="tab" data-tab="plans">See plan →</button></div>';
    if (plan.length) {
      var e = plan[0];
      html += '<div class="card"><div class="meal-card">' + P.recipes.thumb(e.recipe) +
        '<div style="flex:1;min-width:0"><button type="button" class="plan-title" data-action="open-recipe" data-id="' + e.recipe.id + '">' + U.esc(e.recipe.title) + '</button>' +
        '<div class="small muted">⏱ ' + e.recipe.timeMinutes + ' min · Serves ' + e.recipe.servings + '</div></div></div>' +
        '<p class="why">💡 ' + U.esc(e.why) + '</p><div class="chips">' + P.mealplan.useChips(e) + '</div></div>';
    } else {
      html += '<div class="card empty compact"><div class="empty-icon">🍽️</div><strong>No suggestion yet</strong>Scan your Nectar card or add recipes to get ideas.</div>';
    }

    html += '<div class="stat-row"><div class="stat"><b>' + items.length + '</b><span>items in your kitchen</span></div>' +
      '<div class="stat"><b>' + st.cooked.length + '</b><span>meals cooked with Penny</span></div></div>';

    html += '<div class="reset-zone"><button type="button" class="btn btn-small" data-action="reset-demo" data-confirm="Tap again to reset everything">↺ Reset demo</button>' +
      '<p class="small muted" style="margin-top:6px">Reloads the seed data and restarts onboarding.</p></div>';
    return html;
  };

  /* ---------- Onboarding ---------- */
  var OB_STEPS = 4;
  A.renderOnboarding = function () {
    var el = $('#onboarding');
    var st = P.store.state;
    if (st.user.onboarded) { el.hidden = true; return; }
    el.hidden = false;
    var ob = A.ui.ob;
    var dots = '<div class="ob-dots">' + Array.apply(null, Array(OB_STEPS)).map(function (_, i) {
      return '<span class="' + (i === ob.step ? 'on' : '') + '"></span>';
    }).join('') + '</div>';
    var body = '';
    if (ob.step === 0) {
      body = '<div class="ob-hero"><div class="big">🪙</div><h1>Welcome to Penny</h1><p>Your Sainsbury’s shop lands in Penny on its own. We’ll tell you what to use first, and give you something to cook with it.</p></div>' +
        '<div class="ob-body"><div class="field"><label for="ob-name">What should we call you?</label>' +
        '<input id="ob-name" maxlength="30" placeholder="Your first name" value="' + U.esc(ob.name) + '" autocomplete="given-name"></div></div>' +
        '<div class="ob-foot"><button type="button" class="btn btn-primary btn-block" data-action="ob-next">Get started</button>' +
        '<button type="button" class="link-btn" data-action="ob-skip">Skip setup and use the demo profile</button></div>';
    } else if (ob.step === 1) {
      body = '<div class="ob-hero"><div class="big">🥗</div><h1>How do you eat?</h1><p>Penny won’t suggest meals with your allergens.</p></div>' +
        '<div class="ob-body"><div class="field"><span class="label">Diet</span><div class="choice-grid">' +
        P.DIETS.map(function (d) {
          return '<button type="button" class="choice' + (ob.diet === d.id ? ' on' : '') + '" data-action="ob-diet" data-value="' + d.id + '" aria-pressed="' + (ob.diet === d.id) + '">' + d.label + '</button>';
        }).join('') + '</div></div>' +
        '<div class="field" style="margin-top:18px"><span class="label">Allergies (choose any)</span><div class="choice-grid">' +
        P.ALLERGENS.map(function (a) {
          var on = ob.allergies.indexOf(a.id) !== -1;
          return '<button type="button" class="choice' + (on ? ' on' : '') + '" data-action="ob-allergy" data-value="' + a.id + '" aria-pressed="' + on + '">' + a.label + '</button>';
        }).join('') + '</div></div></div>' +
        '<div class="ob-foot"><button type="button" class="btn btn-primary btn-block" data-action="ob-next">Continue</button>' +
        '<button type="button" class="link-btn" data-action="ob-back">Back</button></div>';
    } else if (ob.step === 2) {
      body = '<div class="ob-hero"><div class="big">' + P.IMG.nectar('ob-logo') + '</div><h1>Connect Nectar</h1><p>Scan your Nectar card at Sainsbury’s as usual and your basket syncs to Penny. No typing.</p></div>' +
        '<div class="ob-body"><div class="card"><b>What Nectar shares</b><ul class="share-list">' +
        ['Product name and pack size', 'Quantity', 'Price paid', 'Purchase date'].map(function (s) { return '<li><span class="tick">✓</span>' + s + '</li>'; }).join('') +
        '</ul></div><p class="small muted" style="margin-top:10px">Simulated for this demo. You can unlink at any time.</p></div>' +
        '<div class="ob-foot"><button type="button" class="btn btn-nectar btn-block" data-action="ob-nectar">Connect Nectar</button>' +
        '<button type="button" class="link-btn" data-action="ob-next">Skip for now (add food by hand)</button></div>';
    } else {
      body = '<div class="ob-hero"><div class="big">' + P.IMG.recime('ob-logo rounded') + '</div><h1>Connect ReciMe</h1><p>Recipes you saved from Instagram and TikTok show up in Penny and feed your meal plans.</p></div>' +
        '<div class="ob-body"><div class="recime-card">' + P.IMG.recime() + '<div class="grow"><b>ReciMe</b><div class="small muted">Optional. Imports 3 saved recipes in this demo.</div></div></div></div>' +
        '<div class="ob-foot"><button type="button" class="btn btn-recime btn-block" data-action="ob-recime"' + (A.ui.reciMeLoading ? ' disabled' : '') + '>' +
        (A.ui.reciMeLoading ? 'Linking…' : 'Connect ReciMe') + '</button>' +
        '<button type="button" class="link-btn" data-action="ob-finish">Maybe later</button></div>';
    }
    el.innerHTML = '<div class="ob-step">' + dots + body + '</div>';
  };

  function finishOnboarding() {
    var st = P.store.state;
    var ob = A.ui.ob;
    st.user.name = ob.name || st.user.name || 'Alex';
    st.user.diet = ob.diet;
    st.user.allergies = ob.allergies.slice();
    st.user.onboarded = true;
    P.store.save();
    A.go('home');
    A.toast('You’re all set' + (st.user.name ? ', ' + st.user.name : '') + '!', 'success', '🎉');
    setTimeout(function () { P.notifications.check(); A.render(); }, 500);
  }

  function readObName() { var i = $('#ob-name'); if (i) A.ui.ob.name = i.value.trim(); }

  P.actions['ob-next'] = function () { readObName(); A.ui.ob.step = Math.min(OB_STEPS - 1, A.ui.ob.step + 1); A.renderOnboarding(); };
  P.actions['ob-back'] = function () { A.ui.ob.step = Math.max(0, A.ui.ob.step - 1); A.renderOnboarding(); };
  P.actions['ob-diet'] = function (el) { A.ui.ob.diet = el.dataset.value; A.renderOnboarding(); };
  P.actions['ob-allergy'] = function (el) {
    var a = A.ui.ob.allergies, v = el.dataset.value, i = a.indexOf(v);
    if (i === -1) a.push(v); else a.splice(i, 1);
    A.renderOnboarding();
  };
  P.actions['ob-nectar'] = function () {
    P.store.state.user.nectarLinked = true;
    P.store.save();
    A.toast('Nectar linked', 'success');
    A.ui.ob.step = 3;
    A.renderOnboarding();
  };
  P.actions['ob-recime'] = function () {
    P.recipes.linkReciMe(finishOnboarding);
    A.renderOnboarding();
  };
  P.actions['ob-finish'] = function () { finishOnboarding(); };
  P.actions['ob-skip'] = function () {
    readObName();
    A.ui.ob.name = A.ui.ob.name || 'Alex';
    P.store.state.user.nectarLinked = true;
    finishOnboarding();
  };

  /* ---------- Main render ---------- */
  A.render = function () {
    var st = P.store.state;
    $('#demo-date-input').value = st.demoDate;
    var unread = P.notifications.unread();
    var badge = $('#bell-badge');
    if (unread) {
      if (badge.hidden || badge.textContent !== String(unread)) { badge.hidden = false; badge.textContent = unread; badge.style.animation = 'none'; void badge.offsetWidth; badge.style.animation = ''; }
    } else badge.hidden = true;
    $('.bell').setAttribute('aria-label', 'Notifications' + (unread ? ', ' + unread + ' unread' : ''));

    document.querySelectorAll('#nav button').forEach(function (b) {
      var on = b.dataset.tab === A.ui.tab;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });

    var ov = A.ui.overlay;
    var overlay = $('#overlay');
    TABS.forEach(function (t) { $('#tab-' + t).hidden = !!ov || t !== A.ui.tab; });
    if (ov) {
      overlay.hidden = false;
      overlay.innerHTML = ov.type === 'notifications' ? P.notifications.render() :
        ov.type === 'event' ? P.community.eventDetail(ov.id) : P.recipes.detail(ov.id);
    } else {
      overlay.hidden = true;
      overlay.innerHTML = '';
      var renderers = { home: A.renderHome, inventory: P.inventory.render, recipes: P.recipes.render, community: P.community.render, plans: P.mealplan.render };
      $('#tab-' + A.ui.tab).innerHTML = renderers[A.ui.tab]();
    }
    A.renderOnboarding();
  };

  /* ---------- Global actions ---------- */
  P.actions.tab = function (el) { A.go(el.dataset.tab); };
  P.actions['overlay-back'] = function () { A.closeOverlay(); };
  P.actions['sheet-close'] = function () { A.closeSheet(); };
  P.actions['date-plus'] = function () { A.setDate(U.addDays(P.store.today(), 1)); };
  P.actions['reset-demo'] = function () { P.store.reset(); };

  /* ---------- Event wiring ---------- */
  function onClick(e) {
    var el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    var fn = P.actions[el.dataset.action];
    if (!fn) return;
    // Two-tap confirmation for destructive actions.
    if (el.dataset.confirm && el.dataset.armed !== '1') {
      e.preventDefault();
      el.dataset.armed = '1';
      el.dataset.orig = el.innerHTML;
      el.textContent = el.dataset.confirm;
      el.classList.add('armed');
      setTimeout(function () {
        if (el.isConnected && el.dataset.armed === '1') { el.dataset.armed = ''; el.innerHTML = el.dataset.orig; el.classList.remove('armed'); }
      }, 3000);
      return;
    }
    fn(el, e);
  }
  function onSubmit(e) {
    var form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    var fn = P.forms[form.dataset.form];
    if (fn) fn(form);
  }

  function init() {
    P.store.load();
    document.addEventListener('click', onClick);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') A.closeSheet();
      if (e.key === 'Enter' && e.target.id === 'ob-name') P.actions['ob-next']();
    });
    $('#demo-date-input').addEventListener('change', function (e) {
      if (e.target.value) A.setDate(e.target.value); else e.target.value = P.store.today();
    });
    A.render();
    if (P.store.state.user.onboarded) {
      setTimeout(function () { P.notifications.check(); A.render(); }, 400);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.Penny);
