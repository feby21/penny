/* Penny – food-saving score and 3-day meal plan from leftovers. */
(function (P) {
  'use strict';
  var U = P.util;
  var M = P.mealplan = {};
  var DAYS = 3;
  var URGENT = 2; // items with 0–2 days left are "expiring": highlighted and never reused across meals

  M.isStaple = function (name) { return P.STAPLES.indexOf(U.norm(name)) !== -1; };

  // Items still usable on plan day k (0 = today): not used, not past expiry by that day.
  M.availableItems = function (k) {
    return P.inventory.active().filter(function (i) { return P.inventory.daysLeft(i) >= (k || 0); });
  };

  // Case-insensitive "contains" at word starts. Prefer items whose name contains the ingredient,
  // then the one expiring soonest, so the planner uses up the most urgent stock first.
  M.findItem = function (ingName, items, claimed) {
    var best = null, bestQ = 0;
    items.forEach(function (it) {
      if (claimed[it.id]) return;
      var q = U.wordStart(ingName, it.name) ? 2 : U.wordStart(it.name, ingName) ? 1 : 0;
      if (!q) return;
      if (!best || q > bestQ || (q === bestQ && it.expiryDate < best.expiryDate)) { best = it; bestQ = q; }
    });
    return best;
  };

  M.match = function (recipe, items, claimed) {
    var uses = [], missing = [], seen = {};
    recipe.ingredients.forEach(function (ingr) {
      if (M.isStaple(ingr.name)) return;
      var it = M.findItem(ingr.name, items.filter(function (x) { return !seen[x.id]; }), claimed);
      if (it) { uses.push({ ingredient: ingr, item: it }); seen[it.id] = true; }
      else missing.push(ingr);
    });
    return { uses: uses, missing: missing };
  };

  M.expiryPoints = function (d) {
    if (d <= 1) return 1.0;
    if (d === 2) return 0.8;
    if (d === 3) return 0.6;
    if (d <= 5) return 0.4;
    if (d <= 7) return 0.2;
    return 0;
  };

  // v1.1 food-saving score, 0–100.
  M.score = function (m) {
    var exp = 0, opened = 0, low = 0;
    m.uses.forEach(function (u) {
      exp += M.expiryPoints(P.inventory.daysLeft(u.item));
      if (u.item.opened) opened++;
      if (P.inventory.isLow(u.item)) low++;
    });
    var cost = m.missing.reduce(function (s, i) { return s + (Number(i.cost) || 0); }, 0);
    var parts = {
      expiring: Math.min(exp, 2) / 2,
      opened: Math.min(opened, 2) / 2,
      lowQty: Math.min(low, 2) / 2,
      fewMissing: Math.max(0, 1 - 0.5 * m.missing.length),
      lowSpend: Math.max(0, 1 - cost / 3)
    };
    var total = 35 * parts.expiring + 20 * parts.opened + 15 * parts.lowQty + 20 * parts.fewMissing + 10 * parts.lowSpend;
    return { total: Math.round(total), parts: parts, cost: cost };
  };

  M.eligible = function (r) {
    var user = P.store.state.user;
    if (!P.recipes.fitsDiet(r, user.diet)) return false;
    var al = P.recipes.allergensOf(r);
    return !al.some(function (a) { return user.allergies.indexOf(a) !== -1; });
  };

  function whyLine(entry) {
    // Mention the items that earned expiry points (7 days or fewer), soonest first.
    var urgent = entry.match.uses.filter(function (u) { return P.inventory.daysLeft(u.item) <= 7; })
      .sort(function (a, b) { return P.inventory.daysLeft(a.item) - P.inventory.daysLeft(b.item); });
    var first;
    if (urgent.length) {
      first = 'Uses up ' + U.list(urgent.slice(0, 3).map(function (u) {
        return u.item.name.toLowerCase() + ' (' + P.inventory.daysText(P.inventory.daysLeft(u.item)).toLowerCase() + ')';
      })) + ' before ' + (urgent.length === 1 ? 'it goes' : 'they go') + ' off';
    } else {
      var total = entry.match.uses.length + entry.match.missing.length;
      first = 'A good fit: ' + entry.match.uses.length + ' of ' + total + ' ingredients are already in your kitchen';
    }
    var buy = entry.match.missing.length ? '; just buy ' + U.list(entry.match.missing.map(function (i) { return i.name.toLowerCase(); })) +
      ' (~' + U.money(entry.score.cost) + ').' : '; nothing extra to buy.';
    return first + buy;
  }

  // Greedy plan: each day picks the best-scoring recipe, never reusing an expiring item or a recipe.
  M.build = function () {
    var st = P.store.state;
    var today = P.store.today();
    if (!st.plan || st.plan.date !== today) st.plan = { date: today, skip: [] };
    var skip = st.plan.skip;
    var pool = P.recipes.planPool().filter(M.eligible);
    var claimed = {}, picked = {}, plan = [];

    for (var k = 0; k < DAYS; k++) {
      var items = M.availableItems(k);
      var best = null;
      pool.forEach(function (r) {
        if (picked[r.id] || skip.indexOf(r.id) !== -1) return;
        var m = M.match(r, items, claimed);
        if (m.missing.length > 2 || !m.uses.length) return;
        var s = M.score(m);
        if (!best || s.total > best.score.total) best = { recipe: r, match: m, score: s };
      });
      if (!best) break;
      best.offset = k;
      best.date = U.addDays(today, k);
      best.why = whyLine(best);
      picked[best.recipe.id] = true;
      best.match.uses.forEach(function (u) { if (P.inventory.daysLeft(u.item) <= URGENT) claimed[u.item.id] = true; });
      plan.push(best);
    }
    return plan;
  };

  function dayLabel(k, date) {
    return (k === 0 ? 'Today' : k === 1 ? 'Tomorrow' : 'Day 3') + ' · ' + U.fmtDay(date);
  }

  M.useChips = function (entry) {
    return entry.match.uses.map(function (u) {
      var d = P.inventory.daysLeft(u.item);
      var cls = d === 0 ? ' today' : d <= URGENT ? ' urgent' : '';
      return '<span class="use-chip' + cls + '">' + U.esc(u.item.name) + (cls ? ' · ' + (d === 0 ? 'today' : d + 'd') : '') + '</span>';
    }).join('');
  };
  M.buyChips = function (entry) {
    if (!entry.match.missing.length) return '<span class="small muted">Nothing. You have it all ✓</span>';
    return entry.match.missing.map(function (i) {
      return '<span class="use-chip buy">+ ' + U.esc(i.name) + ' ~' + U.money(i.cost || 0) + '</span>';
    }).join('');
  };

  M.render = function () {
    var plan = M.build();
    var html = '<div class="page-head"><h1>Meal Plans</h1>' +
      '<button type="button" class="btn btn-small" data-action="plan-regen">' + P.ICONS.refresh + ' Regenerate</button></div>' +
      '<p class="page-sub">A 3-day plan built from your leftovers, using what expires soonest first.</p>';
    if (!plan.length) {
      return html + '<div class="card empty"><div class="empty-icon">🍽️</div><strong>No meals to suggest yet</strong>' +
        'Add items to your inventory, or upload recipes that use what you have.</div>';
    }
    html += plan.map(function (e, k) {
      return '<article class="plan-card">' +
        '<div class="plan-day">' + dayLabel(k, e.date) + '</div>' +
        '<div class="plan-top">' + P.recipes.thumb(e.recipe) +
        '<div class="grow"><button type="button" class="plan-title" data-action="open-recipe" data-id="' + e.recipe.id + '">' + U.esc(e.recipe.title) + '</button>' +
        '<div class="small muted">⏱ ' + e.recipe.timeMinutes + ' min · Serves ' + e.recipe.servings + '</div></div></div>' +
        '<p class="why">💡 ' + U.esc(e.why) + '</p>' +
        '<div class="plan-label">Uses from your kitchen</div><div class="chips">' + M.useChips(e) + '</div>' +
        '<div class="plan-label">To buy</div><div class="chips">' + M.buyChips(e) + '</div>' +
        '<div class="plan-actions">' +
        '<button type="button" class="btn" data-action="open-recipe" data-id="' + e.recipe.id + '">View recipe</button>' +
        '<button type="button" class="btn btn-primary" data-action="plan-cook" data-index="' + k + '">✓ Mark cooked</button>' +
        '</div></article>';
    }).join('');
    if (plan.length < DAYS) {
      html += '<p class="small muted" style="margin-top:12px">Only ' + U.plural(plan.length, 'meal') + ' could be planned from what you have. Add more recipes or shop to fill the rest.</p>';
    }
    html += '<details class="how"><summary>How Penny picks meals</summary><ul>' +
      '<li>Expiring soon: 35%</li><li>Uses opened items: 20%</li><li>Uses low-quantity items: 15%</li>' +
      '<li>Few missing ingredients: 20%</li><li>Low extra spend: 10%</li>' +
      '<li>Skips recipes with your allergens or more than 2 missing items, and never uses the same expiring item twice.</li></ul></details>';
    return html;
  };

  P.actions['plan-regen'] = function () {
    var st = P.store.state;
    var current = M.build();
    st.plan.skip = st.plan.skip.concat(current.map(function (e) { return e.recipe.id; }));
    var next = M.build();
    if (next.length < Math.min(DAYS, current.length) || !next.length) {
      st.plan.skip = [];
      P.app.toast('That’s every option for now. Showing the best plan again.');
    } else {
      P.app.toast('New plan ready', 'success', '🔄');
    }
    P.store.save();
    P.app.render();
  };

  P.actions['plan-cook'] = function (el) {
    var plan = M.build();
    var entry = plan[Number(el.dataset.index)];
    if (!entry) return;
    var used = 0, kept = 0;
    entry.match.uses.forEach(function (u) {
      // Long-life staples (rice, oil, tins…) are only partly used, so they stay in stock.
      if (P.inventory.daysLeft(u.item) > 30) { kept++; return; }
      u.item.used = true;
      u.item.usedOn = P.store.today();
      used++;
    });
    var st = P.store.state;
    st.cooked.push({ recipeId: entry.recipe.id, date: P.store.today(), at: Date.now() });
    st.plan.skip = [];
    P.store.save();
    P.app.toast('Cooked ' + entry.recipe.title + '! ' + U.plural(used, 'item') + ' marked as used' +
      (kept ? ', ' + kept + ' long-life kept' : '') + '.', 'success', '👩‍🍳');
    P.app.render();
  };
})(window.Penny);
