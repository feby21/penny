/* Penny – My Recipes: list, detail, upload form, simulated ReciMe import. */
(function (P) {
  'use strict';
  var U = P.util;
  var R = P.recipes = {};
  var PALETTE = ['#F6E3C8', '#E3F0D9', '#FCE1D6', '#E4ECF7', '#F7E6F0', '#FFF1C9', '#E8E1F5'];
  var EMOJI_WORDS = [['pancake', '🥞'], ['curry', '🍛'], ['rice', '🍚'], ['pasta', '🍝'], ['spaghetti', '🍝'], ['penne', '🍝'],
    ['omelette', '🍳'], ['egg', '🍳'], ['salad', '🥗'], ['soup', '🍲'], ['stew', '🍲'], ['wrap', '🌯'], ['taco', '🌮'],
    ['burger', '🍔'], ['pizza', '🍕'], ['chicken', '🍗'], ['salmon', '🐟'], ['fish', '🐟'], ['cake', '🍰'], ['cookie', '🍪'],
    ['toast', '🍞'], ['sandwich', '🥪'], ['smoothie', '🥤'], ['noodle', '🍜'], ['potato', '🥔']];

  R.all = function () { return P.store.state.recipes; };
  R.get = function (id) { return R.all().find(function (r) { return r.id === id; }); };
  R.mine = function () { return R.all().filter(function (r) { return r.authorId === 'me' && r.source === 'penny'; }).sort(byNewest); };
  R.recime = function () { return R.all().filter(function (r) { return r.source === 'recime'; }).sort(byNewest); };
  R.savedList = function () {
    var st = P.store.state;
    return st.saved.map(R.get).filter(function (r) { return r && r.visibility === 'public'; });
  };
  // Recipes the meal planner can draw on: the user's own, ReciMe imports and the Community Hub.
  R.planPool = function () {
    return R.all().filter(function (r) { return r.authorId === 'me' || r.visibility === 'public'; });
  };
  function byNewest(a, b) { return b.createdAt - a.createdAt; }

  R.allergensOf = function (r) {
    return P.ALLERGENS.filter(function (a) {
      return r.ingredients.some(function (i) { return U.hasAnyWord(i.name, a.words); });
    }).map(function (a) { return a.id; });
  };
  R.fitsDiet = function (r, diet) {
    if (diet === 'vegetarian' || diet === 'vegan') {
      if (r.ingredients.some(function (i) { return U.hasAnyWord(i.name, P.MEAT_WORDS); })) return false;
    }
    if (diet === 'vegan' && r.ingredients.some(function (i) { return U.hasAnyWord(i.name, P.ANIMAL_WORDS); })) return false;
    return true;
  };
  R.guessCost = function (name) {
    var hit = P.PRICE_GUESS.find(function (p) { return U.wordStart(p[0], name); });
    return hit ? hit[1] : 1.0;
  };
  R.guessEmoji = function (title) {
    var hit = EMOJI_WORDS.find(function (e) { return U.norm(title).indexOf(e[0]) !== -1; });
    return hit ? hit[1] : '🍽️';
  };

  R.thumb = function (r) {
    return '<div class="thumb" style="background:' + U.esc(r.color || '#F4EFE7') + '"><span>' + (r.emoji || '🍽️') + '</span>' +
      (r.image ? '<img src="' + U.esc(r.image) + '" alt="" loading="lazy" onerror="this.remove()">' : '') + '</div>';
  };
  R.sourceTag = function (r) {
    if (r.source === 'recime') {
      var p = U.norm(r.sourcePlatform);
      return '<span class="tag tag-' + p + '">' + U.esc(r.sourcePlatform) + ' · ReciMe</span>';
    }
    return '';
  };
  R.visTag = function (r) {
    return r.visibility === 'public' ? '<span class="tag tag-public">Public</span>' : '<span class="tag tag-private">Private</span>';
  };

  /* ---------- Filters ---------- */
  R.costPerServing = function (r) {
    var total = r.ingredients.reduce(function (s, i) { return s + (Number(i.cost) || 0); }, 0);
    return total / Math.max(1, r.servings);
  };
  function mainIngredients(r) { return r.ingredients.filter(function (i) { return !P.mealplan.isStaple(i.name); }); }

  // Quick filters students tend to reach for. Each is a yes/no test on a recipe.
  R.QUICK = [
    { id: 'freezer', label: '❄️ Freezer-friendly', test: function (r) { return !!r.freezer; } },
    { id: 'quick', label: '⚡ 20 min or less', test: function (r) { return r.timeMinutes <= 20; } },
    { id: 'budget', label: '💷 Under £1.50 a portion', test: function (r) { return R.costPerServing(r) <= 1.5; } },
    { id: 'have', label: '🧺 Cook with what I have', test: function (r) { return P.mealplan.match(r, P.mealplan.availableItems(0), {}).missing.length <= 1; } },
    { id: 'veggie', label: '🌱 Vegetarian', test: function (r) { return R.fitsDiet(r, 'vegetarian'); } },
    { id: 'vegan', label: '🌿 Vegan', test: function (r) { return R.fitsDiet(r, 'vegan'); } },
    { id: 'protein', label: '💪 High protein', test: function (r) { return !!r.highProtein; } },
    { id: 'onepot', label: '🍲 One pot', test: function (r) { return !!r.onePot; } },
    { id: 'few', label: '🖐 5 ingredients or fewer', test: function (r) { return mainIngredients(r).length <= 5; } },
    { id: 'batch', label: '📦 Batch cook (serves 4+)', test: function (r) { return r.servings >= 4; } },
    { id: 'safe', label: '✅ Safe for my allergies', test: function (r) {
      var mine = P.store.state.user.allergies;
      return !R.allergensOf(r).some(function (a) { return mine.indexOf(a) !== -1; });
    } }
  ];

  R.filters = function () {
    var ui = P.app.ui;
    if (!ui.recipeFilters) ui.recipeFilters = { scope: 'mine', q: '', meal: 'any', cuisine: 'any', tags: [] };
    return ui.recipeFilters;
  };
  R.activeCount = function (f) {
    return (f.q ? 1 : 0) + (f.meal !== 'any' ? 1 : 0) + (f.cuisine !== 'any' ? 1 : 0) + f.tags.length;
  };
  R.scopeList = function (scope) {
    if (scope === 'all') return R.planPool().slice().sort(byNewest);
    var seen = {};
    return R.mine().concat(R.recime(), R.savedList()).filter(function (r) { return seen[r.id] ? false : (seen[r.id] = true); });
  };
  R.applyFilters = function (list, f) {
    var q = U.norm(f.q);
    return list.filter(function (r) {
      if (q && U.norm(r.title).indexOf(q) === -1 &&
        !r.ingredients.some(function (i) { return U.norm(i.name).indexOf(q) !== -1; })) return false;
      if (f.meal !== 'any' && (r.meals || []).indexOf(f.meal) === -1) return false;
      if (f.cuisine !== 'any' && (r.cuisine || 'Other') !== f.cuisine) return false;
      return f.tags.every(function (id) {
        var t = R.QUICK.find(function (x) { return x.id === id; });
        return !t || t.test(r);
      });
    });
  };

  R.filterBar = function () {
    var f = R.filters();
    var st = P.store.state;
    var quick = R.QUICK.filter(function (t) { return t.id !== 'safe' || st.user.allergies.length; });
    var n = R.activeCount(f);
    return '<div class="filter-bar">' +
      '<div class="search-row"><input type="search" id="recipe-search" placeholder="Search dish or ingredient" value="' + U.esc(f.q) + '" aria-label="Search recipes" autocomplete="off">' +
      '<select id="recipe-cuisine" aria-label="Cuisine"><option value="any">All cuisines</option>' +
      P.CUISINES.map(function (c) { return '<option' + (f.cuisine === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>' +
      '<div class="filter-row" role="group" aria-label="Meal">' +
      [{ id: 'any', label: 'Any meal', emoji: '' }].concat(P.MEALS).map(function (m) {
        var on = f.meal === m.id;
        return '<button type="button" class="filter-chip' + (on ? ' on' : '') + '" data-action="recipe-meal" data-value="' + m.id + '" aria-pressed="' + on + '">' + (m.emoji ? m.emoji + ' ' : '') + m.label + '</button>';
      }).join('') + '</div>' +
      '<div class="filter-row tags" role="group" aria-label="Quick filters">' +
      quick.map(function (t) {
        var on = f.tags.indexOf(t.id) !== -1;
        return '<button type="button" class="filter-chip small-chip' + (on ? ' on' : '') + '" data-action="recipe-tag" data-value="' + t.id + '" aria-pressed="' + on + '">' + t.label + '</button>';
      }).join('') + '</div>' +
      '<div class="filter-status"' + (n ? '' : ' hidden') + '><span data-filter-count>' + U.plural(n, 'filter') + ' on</span>' +
      '<button type="button" class="link-btn" data-action="recipe-clear">Clear all</button></div>' +
      '</div>';
  };

  R.results = function () {
    var f = R.filters();
    var st = P.store.state;
    if (f.scope === 'mine' && !R.activeCount(f)) return R.sections();
    var list = R.applyFilters(R.scopeList(f.scope), f);
    var html = '<div class="section-title"><h2>' + (f.scope === 'all' ? 'All recipes' : 'My recipes') + '</h2><span class="count">' + U.plural(list.length, 'recipe') + '</span></div>';
    if (!list.length) {
      return html + '<div class="card empty"><div class="empty-icon">🔍</div><strong>No recipes match</strong>' +
        'Try removing a filter' + (f.scope === 'mine' ? ', or search All recipes.' : '.') +
        '<div class="btn-row" style="margin-top:12px;justify-content:center">' +
        (f.scope === 'mine' ? '<button type="button" class="btn btn-small" data-action="recipe-scope" data-value="all">Search all recipes</button>' : '') +
        '<button type="button" class="btn btn-small" data-action="recipe-clear">Clear filters</button></div></div>';
    }
    return html + list.map(function (r) { return R.row(r, { showAuthor: r.authorId !== 'me' }); }).join('');
  };
  R.updateResults = function () {
    var box = document.getElementById('recipe-results');
    if (box) box.innerHTML = R.results();
    var status = document.querySelector('.filter-status');
    var n = R.activeCount(R.filters());
    if (status) {
      status.hidden = !n;
      status.querySelector('[data-filter-count]').textContent = U.plural(n, 'filter') + ' on';
    }
  };

  R.tagChips = function (r) {
    var chips = [];
    if (r.cuisine) chips.push(r.cuisine);
    (r.meals || []).forEach(function (m) { var x = P.MEALS.find(function (y) { return y.id === m; }); if (x) chips.push(x.emoji + ' ' + x.label); });
    if (r.freezer) chips.push('❄️ Freezer-friendly');
    if (r.onePot) chips.push('🍲 One pot');
    if (r.highProtein) chips.push('💪 High protein');
    if (R.fitsDiet(r, 'vegan')) chips.push('🌿 Vegan'); else if (R.fitsDiet(r, 'vegetarian')) chips.push('🌱 Vegetarian');
    chips.push('💷 ~' + U.money(R.costPerServing(r)) + ' a portion');
    return '<div class="chips tag-chips">' + chips.map(function (c) { return '<span class="use-chip">' + U.esc(c) + '</span>'; }).join('') + '</div>';
  };

  R.row = function (r, opts) {
    opts = opts || {};
    var meta = '<span>⏱ ' + r.timeMinutes + ' min</span><span>Serves ' + r.servings + '</span>' +
      (r.cuisine ? '<span>' + U.esc(r.cuisine) + '</span>' : '') + (r.freezer ? '<span title="Freezer-friendly">❄️</span>' : '');
    if (r.source === 'recime') meta += R.sourceTag(r);
    else if (opts.showAuthor) meta += '<span>by ' + U.esc(P.community.userName(r.authorId)) + '</span>';
    else meta += R.visTag(r);
    return '<button type="button" class="recipe-row" data-action="open-recipe" data-id="' + r.id + '">' + R.thumb(r) +
      '<div><div class="r-title">' + U.esc(r.title) + '</div><div class="r-meta">' + meta + '</div></div></button>';
  };

  R.render = function () {
    var st = P.store.state;
    var f = R.filters();
    var html = '<div class="page-head"><h1>' + (f.scope === 'all' ? 'Recipes' : 'My Recipes') + '</h1>' +
      '<button type="button" class="btn btn-primary btn-small" data-action="recipe-new">+ Upload recipe</button></div>' +
      '<p class="page-sub">Recipes you like, ready for your meal plans.</p>' +
      '<div class="seg seg-full" role="group" aria-label="Which recipes">' +
      '<button type="button" class="' + (f.scope === 'mine' ? 'on' : '') + '" data-action="recipe-scope" data-value="mine" aria-pressed="' + (f.scope === 'mine') + '">My recipes</button>' +
      '<button type="button" class="' + (f.scope === 'all' ? 'on' : '') + '" data-action="recipe-scope" data-value="all" aria-pressed="' + (f.scope === 'all') + '">All recipes</button></div>' +
      R.filterBar();

    if (!st.user.reciMeLinked && f.scope === 'mine') {
      html += '<div class="recime-card"><div class="recime-logo">R</div><div class="grow"><b>Link ReciMe</b>' +
        '<div class="small muted">Bring in recipes you saved from Instagram and TikTok.</div></div>' +
        '<button type="button" class="btn btn-small btn-primary" data-action="recime-link"' + (P.app.ui.reciMeLoading ? ' disabled' : '') + '>' +
        (P.app.ui.reciMeLoading ? 'Linking…' : 'Link') + '</button></div>';
    }

    return html + '<div id="recipe-results">' + R.results() + '</div>';
  };

  // Default view (My recipes, no filters): grouped by where the recipe came from.
  R.sections = function () {
    var st = P.store.state;
    var mine = R.mine(), rec = R.recime(), saved = R.savedList();
    var html = '<div class="section-title"><h2>My uploads</h2><span class="count">' + mine.length + '</span></div>';
    html += mine.length ? mine.map(function (r) { return R.row(r); }).join('') :
      '<div class="card empty compact"><div class="empty-icon">📝</div><strong>No recipes yet</strong>Upload a dish you love. It takes under 2 minutes.</div>';

    html += '<div class="section-title"><h2>From ReciMe</h2><span class="count">' + (st.user.reciMeLinked ? 'Linked ✓' : 'Not linked') + '</span></div>';
    html += rec.length ? rec.map(function (r) { return R.row(r); }).join('') :
      '<div class="card empty compact"><div class="empty-icon">📲</div><strong>Nothing imported</strong>Link ReciMe above to pull in your saved social recipes.</div>';

    html += '<div class="section-title"><h2>Saved from Community</h2><span class="count">' + saved.length + '</span></div>';
    html += saved.length ? saved.map(function (r) { return R.row(r, { showAuthor: true }); }).join('') :
      '<div class="card empty compact"><div class="empty-icon">🔖</div><strong>No saved recipes</strong>Tap Save on a Community recipe to keep it here.</div>';
    return html;
  };

  /* ---------- Detail view (shared by Recipes, Community and Meal Plans) ---------- */
  R.detail = function (id) {
    var r = R.get(id);
    if (!r) return '<div class="card empty"><strong>Recipe not found</strong>It may have been deleted.</div>';
    var st = P.store.state;
    var own = r.authorId === 'me';
    var items = P.mealplan.availableItems(0);
    var liked = r.likes.indexOf('me') !== -1;
    var saved = st.saved.indexOf(r.id) !== -1;

    var html = '<div class="back-bar"><button type="button" class="link-btn" data-action="overlay-back">' + P.ICONS.back + ' Back</button></div>' +
      '<div class="detail-hero">' + R.thumb(r) + '</div>' +
      '<h1 class="detail-title">' + U.esc(r.title) + '</h1>' +
      '<div class="detail-meta"><span>by ' + U.esc(P.community.userName(r.authorId)) + '</span><span>⏱ ' + r.timeMinutes + ' min</span>' +
      '<span>Serves ' + r.servings + '</span>' + R.sourceTag(r) + (own ? R.visTag(r) : '') + '</div>' + R.tagChips(r);

    html += '<div class="rcard-actions">';
    if (r.visibility === 'public') {
      html += '<button type="button" class="pill-btn' + (liked ? ' liked' : '') + '" data-action="like" data-id="' + r.id + '" aria-pressed="' + liked + '">' +
        P.ICONS.heart + r.likes.length + '</button>';
    }
    if (!own) {
      html += '<button type="button" class="pill-btn' + (saved ? ' saved' : '') + '" data-action="save" data-id="' + r.id + '" aria-pressed="' + saved + '">' +
        P.ICONS.bookmark + (saved ? 'Saved' : 'Save') + '</button>';
    } else {
      html += '<button type="button" class="pill-btn" data-action="recipe-visibility" data-id="' + r.id + '">' +
        (r.visibility === 'public' ? 'Make private' : 'Share to Community') + '</button>' +
        '<button type="button" class="pill-btn push btn-danger" data-action="recipe-delete" data-id="' + r.id + '" data-confirm="Tap to confirm">Delete</button>';
    }
    html += '</div>';

    var allergens = R.allergensOf(r).filter(function (a) { return st.user.allergies.indexOf(a) !== -1; });
    if (allergens.length) {
      html += '<div class="note note-red" style="margin-top:12px">Contains ' + U.list(allergens.map(function (a) {
        return P.ALLERGENS.find(function (x) { return x.id === a; }).label.toLowerCase();
      })) + ', which you said you avoid. Penny won’t suggest it in meal plans.</div>';
    }

    html += '<div class="section-title"><h2>Ingredients</h2><span class="count">checked against your kitchen</span></div><div class="card"><ul class="ing-list">' +
      r.ingredients.map(function (ingr) {
        var status;
        if (P.mealplan.isStaple(ingr.name)) status = '<span class="ing-status ing-miss">Store cupboard</span>';
        else {
          var it = P.mealplan.findItem(ingr.name, items, {});
          if (it) {
            var d = P.inventory.daysLeft(it);
            status = '<span class="ing-status ' + (d <= 2 ? 'ing-soon' : 'ing-have') + '">✓ ' + U.esc(it.name) + (d <= 2 ? ' · ' + P.inventory.daysText(d) : '') + '</span>';
          } else {
            status = '<span class="ing-status ing-miss">To buy · ~' + U.money(ingr.cost || 0) + '</span>';
          }
        }
        return '<li><div><b>' + U.esc(ingr.name) + '</b> <span class="muted small">' + U.esc(ingr.amount) + '</span></div>' + status + '</li>';
      }).join('') + '</ul></div>';

    html += '<div class="section-title"><h2>Method</h2></div><div class="card"><ol class="steps">' +
      r.steps.map(function (s) { return '<li>' + U.esc(s) + '</li>'; }).join('') + '</ol></div>';

    if (r.visibility === 'public') html += P.community.commentsHtml(r);
    else html += '<p class="small muted" style="margin-top:16px">This recipe is private. Share it to the Community Hub to get likes and comments.</p>';
    return html;
  };

  /* ---------- Upload form ---------- */
  function ingRow(name, amount) {
    return '<div class="dyn-row" data-ing><input class="grow" name="ingName" placeholder="Ingredient" maxlength="50" value="' + U.esc(name || '') + '" aria-label="Ingredient name">' +
      '<input class="amt" name="ingAmount" placeholder="Amount" maxlength="20" value="' + U.esc(amount || '') + '" aria-label="Amount">' +
      '<button type="button" class="remove-btn" data-action="ing-remove" aria-label="Remove ingredient">×</button></div>';
  }
  function stepRow(text) {
    return '<div class="dyn-row" data-step><span class="num"></span><textarea class="grow" name="step" rows="2" maxlength="300" placeholder="Describe this step" aria-label="Step">' + U.esc(text || '') + '</textarea>' +
      '<button type="button" class="remove-btn" data-action="step-remove" aria-label="Remove step">×</button></div>';
  }
  function renumber(form) {
    form.querySelectorAll('[data-step] .num').forEach(function (n, i) { n.textContent = (i + 1) + '.'; });
  }

  R.openForm = function () {
    var html = '<form class="form" data-form="recipe" novalidate>' +
      '<div class="field"><label for="rf-title">Title</label><input id="rf-title" name="title" maxlength="60" placeholder="e.g. Halloumi traybake" required></div>' +
      '<div class="field"><span class="label">Ingredients</span><div data-ings>' + ingRow() + ingRow() + '</div>' +
      '<button type="button" class="link-btn" data-action="ing-add">+ Add ingredient</button></div>' +
      '<div class="field"><span class="label">Steps</span><div data-steps>' + stepRow() + '</div>' +
      '<button type="button" class="link-btn" data-action="step-add">+ Add step</button></div>' +
      '<div class="field-row">' +
      '<div class="field"><label for="rf-time">Time (minutes)</label><input id="rf-time" name="time" type="number" min="1" max="600" inputmode="numeric" value="20"></div>' +
      '<div class="field"><label for="rf-serv">Servings</label><input id="rf-serv" name="servings" type="number" min="1" max="20" inputmode="numeric" value="2"></div>' +
      '</div>' +
      '<div class="field"><label for="rf-cuisine">Cuisine</label><select id="rf-cuisine" name="cuisine">' +
      P.CUISINES.map(function (c) { return '<option' + (c === 'Other' ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><span class="label">Good for</span><div class="choice-grid">' +
      P.MEALS.map(function (m) {
        return '<label class="choice check-choice"><input type="checkbox" name="meal" value="' + m.id + '"' + (m.id === 'dinner' ? ' checked' : '') + '> ' + m.emoji + ' ' + m.label + '</label>';
      }).join('') + '</div></div>' +
      '<div class="field"><span class="label">Tags</span><div class="choice-grid">' +
      '<label class="choice check-choice"><input type="checkbox" name="freezer"> ❄️ Freezer-friendly</label>' +
      '<label class="choice check-choice"><input type="checkbox" name="onePot"> 🍲 One pot</label>' +
      '<label class="choice check-choice"><input type="checkbox" name="highProtein"> 💪 High protein</label>' +
      '</div></div>' +
      '<div class="field"><label for="rf-img">Image URL (optional)</label><input id="rf-img" name="image" type="url" placeholder="https://…"></div>' +
      '<label class="switch"><span><b>Public</b><br><span class="small muted">Share to the Community Hub</span></span><input type="checkbox" name="public" checked aria-label="Public recipe"></label>' +
      '<p class="form-error" data-error hidden></p>' +
      '<button type="submit" class="btn btn-primary btn-block">Upload recipe</button></form>';
    P.app.openSheet('Upload recipe', html);
    renumber(document.querySelector('#sheet form'));
  };

  P.forms.recipe = function (form) {
    var err = form.querySelector('[data-error]');
    var title = form.elements.title.value.trim();
    var ingredients = [];
    form.querySelectorAll('[data-ing]').forEach(function (row) {
      var name = row.querySelector('[name=ingName]').value.trim();
      var amount = row.querySelector('[name=ingAmount]').value.trim();
      if (name) ingredients.push({ name: name, amount: amount, cost: R.guessCost(name) });
    });
    var steps = [];
    form.querySelectorAll('[name=step]').forEach(function (t) { if (t.value.trim()) steps.push(t.value.trim()); });
    var problem = !title ? 'Please add a title.' : !ingredients.length ? 'Add at least one ingredient.' : !steps.length ? 'Add at least one step.' : '';
    var image = form.elements.image.value.trim();
    if (!problem && image && !/^https?:\/\//i.test(image)) problem = 'Image URL should start with http:// or https://';
    if (problem) { err.textContent = problem; err.hidden = false; return; }

    var isPublic = form.elements.public.checked;
    var recipe = {
      id: U.uid('r'), authorId: 'me', title: title, emoji: R.guessEmoji(title),
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      ingredients: ingredients, steps: steps,
      timeMinutes: Math.max(1, parseInt(form.elements.time.value, 10) || 20),
      servings: Math.max(1, parseInt(form.elements.servings.value, 10) || 2),
      cuisine: form.elements.cuisine.value,
      meals: Array.prototype.filter.call(form.querySelectorAll('[name=meal]'), function (c) { return c.checked; }).map(function (c) { return c.value; }),
      freezer: form.elements.freezer.checked, onePot: form.elements.onePot.checked, highProtein: form.elements.highProtein.checked,
      image: image, visibility: isPublic ? 'public' : 'private', source: 'penny', sourcePlatform: null,
      likes: [], createdAt: Date.now()
    };
    P.store.state.recipes.push(recipe);
    P.store.save();
    P.app.closeSheet();
    P.app.toast(isPublic ? '“' + title + '” is live in the Community Hub' : 'Saved “' + title + '” to My Recipes', 'success', '📖');
    P.app.render();
  };

  /* ---------- ReciMe ---------- */
  R.linkReciMe = function (done) {
    var st = P.store.state;
    if (st.user.reciMeLinked) { if (done) done(); return; }
    P.app.ui.reciMeLoading = true;
    P.app.render();
    setTimeout(function () {
      var now = Date.now();
      P.RECIME_RECIPES.forEach(function (x, i) {
        if (R.get(x.id)) return;
        var r = U.clone(x);
        Object.assign(r, { authorId: 'me', image: '', visibility: 'private', source: 'recime', likes: [], createdAt: now - i * 60000 });
        P.store.applyTags(r);
        st.recipes.push(r);
      });
      st.user.reciMeLinked = true;
      P.store.save();
      P.app.ui.reciMeLoading = false;
      P.app.toast('ReciMe linked: imported ' + P.RECIME_RECIPES.length + ' recipes', 'success', '📲');
      if (done) done(); else P.app.render();
    }, 900);
  };

  /* ---------- Actions ---------- */
  P.actions['recipe-new'] = function () { R.openForm(); };
  P.actions['recipe-scope'] = function (el) { R.filters().scope = el.dataset.value; P.app.render(); };
  P.actions['recipe-meal'] = function (el) { R.filters().meal = el.dataset.value; P.app.render(); };
  P.actions['recipe-tag'] = function (el) {
    var tags = R.filters().tags, i = tags.indexOf(el.dataset.value);
    if (i === -1) tags.push(el.dataset.value); else tags.splice(i, 1);
    P.app.render();
  };
  P.actions['recipe-clear'] = function () {
    var f = R.filters();
    f.q = ''; f.meal = 'any'; f.cuisine = 'any'; f.tags = [];
    P.app.render();
  };
  // Search updates only the results so the text box keeps focus while typing.
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'recipe-search') return;
    R.filters().q = e.target.value;
    R.updateResults();
  });
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'recipe-cuisine') return;
    R.filters().cuisine = e.target.value;
    P.app.render();
  });
  P.actions['recime-link'] = function () { R.linkReciMe(); };
  P.actions['open-recipe'] = function (el) { P.app.openOverlay({ type: 'recipe', id: el.dataset.id }); };
  P.actions['ing-add'] = function (el) {
    var box = el.closest('form').querySelector('[data-ings]');
    box.insertAdjacentHTML('beforeend', ingRow());
    box.lastElementChild.querySelector('input').focus();
  };
  P.actions['ing-remove'] = function (el) {
    var box = el.closest('[data-ings]');
    if (box.children.length > 1) el.closest('[data-ing]').remove();
    else box.querySelectorAll('input').forEach(function (i) { i.value = ''; });
  };
  P.actions['step-add'] = function (el) {
    var form = el.closest('form');
    var box = form.querySelector('[data-steps]');
    box.insertAdjacentHTML('beforeend', stepRow());
    renumber(form);
    box.lastElementChild.querySelector('textarea').focus();
  };
  P.actions['step-remove'] = function (el) {
    var form = el.closest('form');
    var box = form.querySelector('[data-steps]');
    if (box.children.length > 1) el.closest('[data-step]').remove();
    else box.querySelector('textarea').value = '';
    renumber(form);
  };
  P.actions['recipe-visibility'] = function (el) {
    var r = R.get(el.dataset.id);
    if (!r) return;
    r.visibility = r.visibility === 'public' ? 'private' : 'public';
    P.store.save();
    P.app.toast(r.visibility === 'public' ? 'Shared to the Community Hub' : 'Recipe is now private');
    P.app.render();
  };
  P.actions['recipe-delete'] = function (el) {
    var st = P.store.state;
    var id = el.dataset.id;
    st.recipes = st.recipes.filter(function (r) { return r.id !== id; });
    st.comments = st.comments.filter(function (c) { return c.recipeId !== id; });
    st.saved = st.saved.filter(function (s) { return s !== id; });
    P.store.save();
    P.app.toast('Recipe deleted');
    P.app.closeOverlay();
  };
})(window.Penny);
