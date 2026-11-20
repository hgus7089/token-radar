// Token Radar's dashboard. It reads window.RADAR (written beside dashboard/ by main.ts) and
// renders the ranked board, the filters, a per-protocol detail view with the model's own inputs
// and the protocol's farm plan, and the live-token list. No network: every byte it shows is in
// data.js. The page recomputes nothing the board does not already carry; the multipliers shown in
// a detail view are the ones board.json carries for that row.
(function () {
  'use strict';

  var DATA = window.RADAR;
  if (!DATA) return;

  var rows = DATA.rows || [];
  var live = DATA.live || [];
  var state = { q: '', category: 'all', chain: 'all', watchlistOnly: false, sort: 'rank', dir: 1, tab: 'board', selected: null };

  var $ = function (id) { return document.getElementById(id); };
  var statsEl = $('stats'), formulaEl = $('formula'), countEl = $('count'), rowsEl = $('rows');
  var liveCountEl = $('live-count'), liveRowsEl = $('live-rows'), detailEl = $('detail');
  var boardWrap = $('board-wrap'), liveWrap = $('live-wrap');

  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (Math.abs(n) >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + Math.round(n);
  }
  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }
  function fmtAge(days) {
    if (days === null || days === undefined) return 'unknown';
    if (days >= 365) return (days / 365).toFixed(1) + 'y';
    return Math.max(0, Math.round(days)) + 'd';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---- header stats -------------------------------------------------------
  var topValue = rows.length > 0 ? rows[0].implied_value_usd : 0;
  var stats = [
    [String(rows.length), 'protocols ranked'],
    [String(DATA.watchlist_size), 'on the watchlist'],
    [String(DATA.early_size), 'early finds below the floor'],
    [fmtUsd(topValue), 'top implied value'],
    [String(live.length), 'live tokens shown'],
    ['Snapshot ' + DATA.as_of, 'DefiLlama, sealed'],
  ];
  statsEl.innerHTML = stats.map(function (s) {
    return '<div class="stat"><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>';
  }).join('');
  formulaEl.textContent = DATA.model_formula || '';

  // ---- filter options -----------------------------------------------------
  var categories = [];
  var chains = [];
  rows.forEach(function (r) {
    if (r.category && categories.indexOf(r.category) === -1) categories.push(r.category);
    (r.chains || []).forEach(function (c) { if (chains.indexOf(c) === -1) chains.push(c); });
  });
  categories.sort();
  chains.sort();
  var catSel = $('category'), chainSel = $('chain');
  categories.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    catSel.appendChild(o);
  });
  chains.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c; o.textContent = c;
    chainSel.appendChild(o);
  });

  // ---- filtering and sorting ----------------------------------------------
  function filtered() {
    var q = state.q.trim().toLowerCase();
    var out = rows.filter(function (r) {
      if (state.watchlistOnly && !r.watchlist) return false;
      if (state.category !== 'all' && r.category !== state.category) return false;
      if (state.chain !== 'all' && (r.chains || []).indexOf(state.chain) === -1) return false;
      if (q && r.name.toLowerCase().indexOf(q) === -1 && r.slug.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var key = state.sort;
    var dir = state.dir;
    out.sort(function (a, b) {
      var va, vb;
      if (key === 'rank' || key === 'implied') { va = key === 'rank' ? a.rank : a.implied_value_usd; vb = key === 'rank' ? b.rank : b.implied_value_usd; }
      else if (key === 'tvl') { va = a.tvl_usd; vb = b.tvl_usd; }
      else if (key === 'growth') { va = a.change_7d === null ? -1e9 : a.change_7d; vb = b.change_7d === null ? -1e9 : b.change_7d; }
      else if (key === 'age') { va = a.age_days === null ? -1 : a.age_days; vb = b.age_days === null ? -1 : b.age_days; }
      else if (key === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else { va = a.category || ''; vb = b.category || ''; }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return a.rank - b.rank;
    });
    return out;
  }

  function renderBoard() {
    var list = filtered();
    countEl.textContent = list.length + ' of ' + rows.length + ' ranked protocols' +
      (state.watchlistOnly ? ' (watchlist only)' : '') + '. Click a row for its farm plan.';
    if (list.length === 0) {
      rowsEl.innerHTML = '<tr><td colspan="8" class="empty">Nothing matches these filters.</td></tr>';
      return;
    }
    rowsEl.innerHTML = list.map(function (r) {
      var growth = r.change_7d === null ? '<span>n/a</span>' : '<span class="' + (r.change_7d >= 0 ? 'pos' : 'neg') + '">' + fmtPct(r.change_7d) + '</span>';
      var chainText = (r.chains || []).slice(0, 3).join(', ') + ((r.chains || []).length > 3 ? ' +' + ((r.chains || []).length - 3) : '');
      return '<tr data-slug="' + esc(r.slug) + '"' + (state.selected === r.slug ? ' class="selected"' : '') + '>' +
        '<td class="rank">' + r.rank + '</td>' +
        '<td><strong>' + esc(r.name) + '</strong><span class="slug">' + esc(r.slug) + (r.watchlist ? ' · watchlist' : '') + '</span></td>' +
        '<td>' + (r.category ? '<span class="pill">' + esc(r.category) + '</span>' : '—') + '</td>' +
        '<td>' + esc(chainText || '—') + '</td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
        '<td class="num">' + growth + '</td>' +
        '<td class="num">' + fmtAge(r.age_days) + '</td>' +
        '<td class="num"><strong>' + fmtUsd(r.implied_value_usd) + '</strong></td></tr>';
    }).join('');
  }

  function renderLive() {
    liveCountEl.textContent = live.length + ' protocols that already record a token, by market cap. Not ranked.';
    liveRowsEl.innerHTML = live.map(function (r) {
      var chainText = (r.chains || []).slice(0, 3).join(', ') + ((r.chains || []).length > 3 ? ' +' + ((r.chains || []).length - 3) : '');
      return '<tr><td><strong>' + esc(r.name) + '</strong><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + (r.category ? '<span class="pill">' + esc(r.category) + '</span>' : '—') + '</td>' +
        '<td>' + esc(chainText || '—') + '</td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
        '<td class="num">' + fmtUsd(r.mcap_usd) + '</td>' +
        '<td class="num">' + fmtPct(r.change_7d) + '</td></tr>';
    }).join('');
  }

  // ---- detail view ----------------------------------------------------------
  function showDetail(slug) {
    var r = null;
    for (var i = 0; i < rows.length; i++) if (rows[i].slug === slug) { r = rows[i]; break; }
    if (!r) { detailEl.hidden = true; state.selected = null; renderBoard(); return; }
    state.selected = slug;
    var base = r.tvl_usd * DATA.model.base_multiple;
    var multRows = [
      ['Base', 'TVL × 0.25', fmtUsd(base)],
      ['Growth', '7-day change ' + fmtPct(r.change_7d), '×' + r.growth_multiplier.toFixed(2)],
      ['Maturity', 'age ' + fmtAge(r.age_days) + (r.listed_at ? ' (tracked since ' + r.listed_at + ')' : ''), '×' + r.maturity_multiplier.toFixed(2)],
      ['Chains', (r.chains || []).length + ' chain' + ((r.chains || []).length === 1 ? '' : 's') + ': ' + (r.chains || []).join(', '), '×' + r.chain_multiplier.toFixed(2)],
      ['Precedent', 'category ' + (r.category || 'unnamed') + ' launch rate in this snapshot', '×' + r.precedent_multiplier.toFixed(2)],
      ['Implied value', 'the product, rounded', fmtUsd(r.implied_value_usd)],
    ];
    detailEl.innerHTML = '<button type="button" class="close" id="detail-close">Close</button>' +
      '<h2>' + esc(r.name) + '</h2>' +
      '<p class="slug">' + esc(r.slug) + (r.watchlist ? ' · on the watchlist' : ' · early find below the floor') + ' · rank ' + r.rank + ' of ' + rows.length + '</p>' +
      '<p class="facts"><span>TVL <b>' + fmtUsd(r.tvl_usd) + '</b></span>' +
      '<span>7-day <b>' + fmtPct(r.change_7d) + '</b></span>' +
      '<span>Age <b>' + fmtAge(r.age_days) + '</b></span>' +
      '<span>Category <b>' + esc(r.category || '—') + '</b></span>' +
      '<span>Chains <b>' + esc((r.chains || []).join(', ') || '—') + '</b></span>' +
      '<span>Token <b>none recorded</b></span></p>' +
      '<h3>How the value is built</h3>' +
      '<table class="model-table"><tbody>' +
      multRows.map(function (m) { return '<tr><th>' + esc(m[0]) + '</th><td>' + esc(m[1]) + '</td><td>' + esc(m[2]) + '</td></tr>'; }).join('') +
      '</tbody></table>' +
      '<h3>Farm plan — six steps</h3>' +
      '<ol class="steps">' + r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    detailEl.hidden = false;
    $('detail-close').addEventListener('click', function () { detailEl.hidden = true; state.selected = null; renderBoard(); });
    renderBoard();
  }

  // ---- tabs -----------------------------------------------------------------
  function setTab(tab) {
    state.tab = tab;
    $('tab-board').classList.toggle('active', tab === 'board');
    $('tab-live').classList.toggle('active', tab === 'live');
    $('tab-board').setAttribute('aria-selected', tab === 'board' ? 'true' : 'false');
    $('tab-live').setAttribute('aria-selected', tab === 'live' ? 'true' : 'false');
    boardWrap.hidden = tab !== 'board';
    liveWrap.hidden = tab !== 'live';
    if (tab === 'live') renderLive();
  }
  $('tab-board').addEventListener('click', function () { setTab('board'); });
  $('tab-live').addEventListener('click', function () { setTab('live'); });

  // ---- controls ---------------------------------------------------------------
  $('q').addEventListener('input', function (e) { state.q = e.target.value; renderBoard(); });
  catSel.addEventListener('change', function (e) { state.category = e.target.value; renderBoard(); });
  chainSel.addEventListener('change', function (e) { state.chain = e.target.value; renderBoard(); });
  $('watchlist-only').addEventListener('change', function (e) { state.watchlistOnly = e.target.checked; renderBoard(); });
  $('sort').addEventListener('change', function (e) {
    state.sort = e.target.value;
    state.dir = state.sort === 'rank' || state.sort === 'implied' || state.sort === 'tvl' || state.sort === 'growth' || state.sort === 'age' ? -1 : 1;
    if (state.sort === 'rank') state.dir = 1;
    renderBoard();
  });
  document.querySelectorAll('#board thead th[data-sort]').forEach(function (th) {
    th.addEventListener('click', function () {
      var key = th.getAttribute('data-sort');
      if (state.sort === key) state.dir = -state.dir;
      else { state.sort = key; state.dir = key === 'rank' || key === 'name' ? 1 : -1; }
      $('sort').value = key;
      renderBoard();
    });
  });
  rowsEl.addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-slug]');
    if (tr) showDetail(tr.getAttribute('data-slug'));
  });

  // ---- deep links: #detail=<slug>, #cat=<category>, #tab=live ----------------
  function applyHash() {
    var hash = window.location.hash.slice(1);
    detailEl.hidden = true;
    state.selected = null;
    state.category = 'all';
    catSel.value = 'all';
    if (!hash) { renderBoard(); return; }
    var parts = hash.split('&');
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i].split('=');
      if (kv[0] === 'detail' && kv[1]) showDetail(decodeURIComponent(kv[1]));
      if (kv[0] === 'cat' && kv[1]) {
        var c = decodeURIComponent(kv[1]);
        if (categories.indexOf(c) !== -1) { state.category = c; catSel.value = c; }
      }
      if (kv[0] === 'tab' && kv[1] === 'live') setTab('live');
    }
    renderBoard();
  }
  window.addEventListener('hashchange', applyHash);

  renderBoard();
  applyHash();
})();
