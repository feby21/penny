/* Penny – Community Hub: feed, likes, comments, save. */
(function (P) {
  'use strict';
  var U = P.util;
  var C = P.community = {};

  C.user = function (id) {
    var st = P.store.state;
    if (id === 'me') return { id: 'me', name: (st.user.name || 'You'), color: '#2E8B57' };
    return st.users[id] || { id: id, name: 'Penny user', color: '#9AA39D' };
  };
  C.userName = function (id) { var u = C.user(id); return id === 'me' ? u.name + ' (you)' : u.name; };
  C.avatar = function (id) {
    var u = C.user(id);
    return '<span class="avatar" style="background:' + U.esc(u.color) + '">' + U.esc(u.name.charAt(0).toUpperCase()) + '</span>';
  };
  C.commentsFor = function (rid) {
    return P.store.state.comments.filter(function (c) { return c.recipeId === rid; }).sort(function (a, b) { return a.createdAt - b.createdAt; });
  };

  // Feed mixes public recipes and events. "Most liked" ranks events by how many people are going.
  C.feed = function (sort, filter) {
    var st = P.store.state;
    var list = [];
    if (filter !== 'events') list = list.concat(st.recipes.filter(function (r) { return r.visibility === 'public'; }));
    if (filter !== 'recipes') list = list.concat(st.events || []);
    var pop = function (x) { return x.going ? x.going.length : x.likes.length; };
    return list.sort(function (a, b) {
      if (sort === 'liked' && pop(b) !== pop(a)) return pop(b) - pop(a);
      return b.createdAt - a.createdAt;
    });
  };

  /* ---------- Events ---------- */
  C.getEvent = function (id) { return (P.store.state.events || []).find(function (e) { return e.id === id; }); };
  C.eventWhen = function (e) {
    var d = U.diffDays(P.store.today(), e.date);
    var day = d < 0 ? 'Ended ' + U.fmtDay(e.date) : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : U.fmtDay(e.date);
    return day + ' · ' + e.start + '–' + e.end;
  };
  C.isPast = function (e) { return U.diffDays(P.store.today(), e.date) < 0; };
  C.priceText = function (e) { return e.price ? '£' + e.price : 'Free'; };
  C.spotsLeft = function (e) { return Math.max(0, e.capacity - e.going.length); };
  C.dateBadge = function (e) {
    var p = e.date.split('-');
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '<div class="date-badge"><b>' + (+p[2]) + '</b><span>' + months[+p[1] - 1] + '</span></div>';
  };
  C.goingButton = function (e) {
    var going = e.going.indexOf('me') !== -1;
    if (C.isPast(e)) return '<span class="tag">Event ended</span>';
    if (!going && !C.spotsLeft(e)) return '<span class="tag tag-private">Fully booked</span>';
    return '<button type="button" class="pill-btn' + (going ? ' going' : '') + '" data-action="event-going" data-id="' + e.id + '" aria-pressed="' + going + '">' +
      (going ? '✓ Going' : '🙋 I’m going') + '</button>';
  };

  C.eventCard = function (e) {
    var past = C.isPast(e);
    return '<article class="rcard ecard' + (past ? ' past' : '') + '">' +
      '<button type="button" class="rcard-thumb" data-action="open-event" data-id="' + e.id + '" aria-label="Open ' + U.esc(e.title) + '">' +
      '<div class="thumb" style="background:' + U.esc(e.color) + '"><span>' + e.emoji + '</span>' + C.dateBadge(e) +
      '<span class="event-flag">Event · Bristol</span></div></button>' +
      '<div class="rcard-body">' +
      '<div class="author">' + C.avatar(e.hostId) + '<span>Hosted by ' + U.esc(C.userName(e.hostId)) + ' · ' + U.timeAgo(e.createdAt) + '</span></div>' +
      '<button type="button" class="rcard-title" data-action="open-event" data-id="' + e.id + '">' + U.esc(e.title) + '</button>' +
      '<div class="event-meta"><span>🗓 ' + C.eventWhen(e) + '</span><span>📍 ' + U.esc(e.venue) + ', ' + U.esc(e.area) + '</span></div>' +
      '<div class="rcard-meta">' + e.going.length + ' going' + (past ? '' : ' · ' + U.plural(C.spotsLeft(e), 'spot') + ' left') + ' · ' + C.priceText(e) + '</div>' +
      '<div class="rcard-actions">' + C.goingButton(e) +
      '<button type="button" class="pill-btn" data-action="open-event" data-id="' + e.id + '" aria-label="Comments (' + C.commentsFor(e.id).length + ')">' + P.ICONS.comment + C.commentsFor(e.id).length + '</button>' +
      '</div></div></article>';
  };

  C.eventDetail = function (id) {
    var e = C.getEvent(id);
    if (!e) return '<div class="card empty"><strong>Event not found</strong></div>';
    var past = C.isPast(e);
    var faces = e.going.slice(0, 6).map(function (uid) { return C.avatar(uid); }).join('');
    return '<div class="back-bar"><button type="button" class="link-btn" data-action="overlay-back">' + P.ICONS.back + ' Back</button></div>' +
      '<div class="detail-hero"><div class="thumb" style="background:' + U.esc(e.color) + '"><span>' + e.emoji + '</span>' + C.dateBadge(e) +
      '<span class="event-flag">Event · Bristol</span></div></div>' +
      '<h1 class="detail-title">' + U.esc(e.title) + '</h1>' +
      '<div class="detail-meta"><span>Hosted by ' + U.esc(C.userName(e.hostId)) + '</span>' +
      e.tags.map(function (t) { return '<span class="tag tag-public">' + U.esc(t) + '</span>'; }).join('') + '</div>' +
      '<div class="dl">' +
      '<div><dt>When</dt><dd>' + C.eventWhen(e) + '</dd></div>' +
      '<div><dt>Where</dt><dd>' + U.esc(e.venue) + ', ' + U.esc(e.area) + '</dd></div>' +
      '<div><dt>Cost</dt><dd>' + C.priceText(e) + '</dd></div>' +
      '<div><dt>Spots</dt><dd>' + (past ? 'Event ended' : C.spotsLeft(e) + ' of ' + e.capacity + ' left') + '</dd></div>' +
      '</div>' +
      '<div class="card"><p>' + U.esc(e.description) + '</p>' +
      '<div class="going-row"><div class="faces">' + faces + '</div><span class="small muted">' + e.going.length + ' going</span>' +
      '<span style="margin-left:auto">' + C.goingButton(e) + '</span></div></div>' +
      '<p class="small muted" style="margin-top:10px">Demo content: hosts and venues are made up for this prototype.</p>' +
      C.commentsHtml(e);
  };

  C.card = function (r) {
    var st = P.store.state;
    var liked = r.likes.indexOf('me') !== -1;
    var saved = st.saved.indexOf(r.id) !== -1;
    var own = r.authorId === 'me';
    return '<article class="rcard">' +
      '<button type="button" class="rcard-thumb" data-action="open-recipe" data-id="' + r.id + '" aria-label="Open ' + U.esc(r.title) + '">' + P.recipes.thumb(r) + '</button>' +
      '<div class="rcard-body">' +
      '<div class="author">' + C.avatar(r.authorId) + '<span>' + U.esc(C.userName(r.authorId)) + ' · ' + U.timeAgo(r.createdAt) + '</span></div>' +
      '<button type="button" class="rcard-title" data-action="open-recipe" data-id="' + r.id + '">' + U.esc(r.title) + '</button>' +
      '<div class="rcard-meta">⏱ ' + r.timeMinutes + ' min · Serves ' + r.servings + ' · ' + U.plural(r.ingredients.length, 'ingredient') + '</div>' +
      '<div class="rcard-actions">' +
      '<button type="button" class="pill-btn' + (liked ? ' liked' : '') + '" data-action="like" data-id="' + r.id + '" aria-pressed="' + liked + '" aria-label="Like (' + r.likes.length + ')">' + P.ICONS.heart + r.likes.length + '</button>' +
      '<button type="button" class="pill-btn" data-action="open-recipe" data-id="' + r.id + '" aria-label="Comments (' + C.commentsFor(r.id).length + ')">' + P.ICONS.comment + C.commentsFor(r.id).length + '</button>' +
      (own ? '<span class="tag tag-public" style="margin:auto 0 auto auto">Your recipe</span>' :
        '<button type="button" class="pill-btn push' + (saved ? ' saved' : '') + '" data-action="save" data-id="' + r.id + '" aria-pressed="' + saved + '">' + P.ICONS.bookmark + (saved ? 'Saved' : 'Save') + '</button>') +
      '</div></div></article>';
  };

  C.render = function () {
    var sort = P.app.ui.communitySort;
    var filter = P.app.ui.communityFilter || 'all';
    var feed = C.feed(sort, filter);
    var html = '<div class="page-head"><h1>Community</h1>' +
      '<div class="seg" role="group" aria-label="Sort feed">' +
      '<button type="button" class="' + (sort === 'newest' ? 'on' : '') + '" data-action="community-sort" data-value="newest" aria-pressed="' + (sort === 'newest') + '">Newest</button>' +
      '<button type="button" class="' + (sort === 'liked' ? 'on' : '') + '" data-action="community-sort" data-value="liked" aria-pressed="' + (sort === 'liked') + '">Most liked</button>' +
      '</div></div><p class="page-sub">Budget recipes and cook-together events around Bristol.</p>' +
      '<div class="filter-row" role="group" aria-label="Show">' +
      [['all', 'All'], ['recipes', 'Recipes'], ['events', 'Events near you']].map(function (f) {
        return '<button type="button" class="filter-chip' + (filter === f[0] ? ' on' : '') + '" data-action="community-filter" data-value="' + f[0] + '" aria-pressed="' + (filter === f[0]) + '">' + f[1] + '</button>';
      }).join('') + '</div>';
    if (!feed.length) {
      return html + (filter === 'events'
        ? '<div class="card empty"><div class="empty-icon">📅</div><strong>No events right now</strong>Check back soon for cook-togethers near you.</div>'
        : '<div class="card empty"><div class="empty-icon">👩‍🍳</div><strong>No public recipes yet</strong>Upload a recipe and make it public to start the feed.</div>');
    }
    return html + feed.map(function (x) { return x.going ? C.eventCard(x) : C.card(x); }).join('');
  };

  C.commentsHtml = function (r) {
    var list = C.commentsFor(r.id);
    var html = '<div class="section-title"><h2>Comments</h2><span class="count">' + list.length + '</span></div><div class="card">';
    html += list.length ? list.map(function (c) {
      return '<div class="comment">' + C.avatar(c.authorId) + '<div><div class="c-head"><b>' + U.esc(C.userName(c.authorId)) + '</b> · ' + U.timeAgo(c.createdAt) + '</div>' +
        '<div>' + U.esc(c.text) + '</div></div></div>';
    }).join('') : '<div class="empty compact">No comments yet. Be the first!</div>';
    html += '<form class="comment-form" data-form="comment"><input type="hidden" name="recipeId" value="' + r.id + '">' +
      '<input name="text" maxlength="280" placeholder="Add a comment…" aria-label="Add a comment" autocomplete="off">' +
      '<button type="submit" class="btn btn-primary">Post</button></form></div>';
    return html;
  };

  P.forms.comment = function (form) {
    var text = form.elements.text.value.trim();
    if (!text) { form.elements.text.focus(); return; }
    P.store.state.comments.push({ id: U.uid('cm'), recipeId: form.elements.recipeId.value, authorId: 'me', text: text, createdAt: Date.now() });
    P.store.save();
    P.app.toast('Comment posted', 'success', '💬');
    P.app.render();
  };

  P.actions.like = function (el) {
    var r = P.recipes.get(el.dataset.id);
    if (!r) return;
    var i = r.likes.indexOf('me');
    if (i === -1) r.likes.push('me'); else r.likes.splice(i, 1);
    P.store.save();
    P.app.render();
  };
  P.actions.save = function (el) {
    var st = P.store.state;
    var id = el.dataset.id;
    var i = st.saved.indexOf(id);
    if (i === -1) { st.saved.push(id); P.app.toast('Saved to My Recipes', 'success', '🔖'); }
    else { st.saved.splice(i, 1); P.app.toast('Removed from My Recipes'); }
    P.store.save();
    P.app.render();
  };
  P.actions['community-sort'] = function (el) { P.app.ui.communitySort = el.dataset.value; P.app.render(); };
  P.actions['community-filter'] = function (el) { P.app.ui.communityFilter = el.dataset.value; P.app.render(); };
  P.actions['open-event'] = function (el) { P.app.openOverlay({ type: 'event', id: el.dataset.id }); };
  P.actions['event-going'] = function (el) {
    var e = C.getEvent(el.dataset.id);
    if (!e || C.isPast(e)) return;
    var i = e.going.indexOf('me');
    if (i === -1) {
      if (!C.spotsLeft(e)) return;
      e.going.push('me');
      P.app.toast('You’re going to ' + e.title + ' (' + C.eventWhen(e) + ')', 'success', '🎉');
    } else {
      e.going.splice(i, 1);
      P.app.toast('You’re no longer going to ' + e.title);
    }
    P.store.save();
    P.app.render();
  };
})(window.Penny);
