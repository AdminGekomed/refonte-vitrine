/* Gekomed — catalogue feuilletable. Feuilletage : StPageFlip 2.0.7 (MIT). */
(function () {
  'use strict';

  var root = document.querySelector('[data-gkc]');
  if (!root) return;
  root.classList.add('is-js');

  var total = parseInt(root.getAttribute('data-pages'), 10);
  var W = parseInt(root.getAttribute('data-width'), 10);
  var H = parseInt(root.getAttribute('data-height'), 10);
  var RATIO = W / H;
  var MINW = 330; // en dessous de 2 × MINW de large, une seule page à la fois

  var viewer = root.querySelector('[data-gkc-viewer]');
  var stageWrap = root.querySelector('.gkc-stage-wrap');
  var stage = root.querySelector('[data-gkc-stage]');
  var book = root.querySelector('[data-gkc-book]');
  var bar = root.querySelector('.gkc-bar');
  var countEl = root.querySelector('[data-gkc-count]');
  var progressEl = root.querySelector('[data-gkc-progress]');
  var zoom = root.querySelector('[data-gkc-zoom]');
  var zoomScroll = root.querySelector('[data-gkc-zoom-scroll]');
  var zoomPages = root.querySelector('[data-gkc-zoom-pages]');
  var zoomLabel = root.querySelector('[data-gkc-zoom-label]');
  var fullBtn = root.querySelector('[data-gkc-act="full"]');
  var pageEls = Array.prototype.slice.call(book.querySelectorAll('.gkc-page'));
  var chips = Array.prototype.slice.call(root.querySelectorAll('.gkc-chapters [data-gkc-goto]'));

  function load(i) {
    var el = pageEls[i];
    if (!el) return;
    var img = el.querySelector('img');
    if (img.getAttribute('src') || !img.getAttribute('data-src')) return;
    img.addEventListener('load', function () { el.classList.add('is-loaded'); }, { once: true });
    img.src = img.getAttribute('data-src');
  }
  function ensure(i) { for (var k = i - 3; k <= i + 5; k++) load(k); }

  // Sans la bibliothèque : toutes les pages à la suite.
  if (!window.St || !window.St.PageFlip) {
    root.classList.add('gkc--static');
    pageEls.forEach(function (el) { el.querySelector('img').setAttribute('loading', 'lazy'); });
    pageEls.forEach(function (el, i) { load(i); });
    return;
  }

  function isFull() {
    var fs = document.fullscreenElement || document.webkitFullscreenElement;
    return fs === viewer || viewer.classList.contains('is-max');
  }

  function layout() {
    var cs = getComputedStyle(stageWrap);
    var availW = stageWrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    // Flèches latérales de part et d'autre du livre, quand elles sont affichées.
    root.querySelectorAll('.gkc-side').forEach(function (b) {
      if (b.offsetWidth) availW -= b.offsetWidth + (parseFloat(cs.columnGap) || 0);
    });
    var availH = isFull()
      ? viewer.clientHeight - bar.offsetHeight - 72
      : Math.max(320, Math.min(window.innerHeight - 190, 880));
    var w = availW >= 2 * MINW ? Math.min(availW, availH * 2 * RATIO) : Math.min(availW, availH * RATIO);
    if (availW >= 2 * MINW && w < 2 * MINW) w = Math.min(availW, availH * RATIO);
    if (w > 0) stage.style.width = Math.floor(w) + 'px';
  }
  function relayout() {
    layout();
    if (flip) flip.update();
  }

  var startPage = 0;
  var m = /page[-=](\d+)/.exec(location.hash);
  if (m) startPage = Math.min(Math.max(parseInt(m[1], 10), 1), total) - 1;
  ensure(startPage);

  layout();
  var flip = null;
  window.addEventListener('resize', relayout);
  // Divi peut finir sa mise en page après ce script : on recale le livre quand la zone change de largeur.
  var lastWrapW = stageWrap.clientWidth;
  if ('ResizeObserver' in window) {
    new ResizeObserver(function () {
      if (stageWrap.clientWidth === lastWrapW) return;
      lastWrapW = stageWrap.clientWidth;
      relayout();
    }).observe(stageWrap);
  }
  window.addEventListener('load', relayout);

  flip = new window.St.PageFlip(book, {
    width: W,
    height: H,
    size: 'stretch',
    minWidth: MINW,
    maxWidth: W,
    minHeight: 100,
    maxHeight: H,
    startPage: startPage,
    showCover: true,
    usePortrait: true,
    autoSize: true,
    drawShadow: true,
    maxShadowOpacity: 0.4,
    flippingTime: window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 300 : 800,
    mobileScrollSupport: true,
    showPageCorners: true
  });
  flip.loadFromHTML(pageEls);
  book.style.minWidth = '0';
  book.style.minHeight = '0';

  function current() { return flip.getCurrentPageIndex(); }

  function visible(i) {
    if (flip.getOrientation() === 'portrait' || i === 0) return [i];
    var left = i % 2 ? i : i - 1;
    return left + 1 < total ? [left, left + 1] : [left];
  }

  function label(pages) {
    return pages.map(function (p) { return p + 1; }).join('–');
  }

  function setDisabled(act, off) {
    root.querySelectorAll('[data-gkc-act="' + act + '"]').forEach(function (b) { b.disabled = off; });
  }

  function updateUI() {
    var i = current();
    var pages = visible(i);
    var last = pages[pages.length - 1];
    countEl.textContent = label(pages) + ' / ' + total;
    progressEl.style.width = ((last + 1) / total * 100) + '%';
    setDisabled('prev', i === 0);
    setDisabled('first', i === 0);
    setDisabled('next', last >= total - 1);
    setDisabled('last', last >= total - 1);
    var active = null;
    chips.forEach(function (c) {
      if (parseInt(c.getAttribute('data-gkc-goto'), 10) - 1 <= last) active = c;
    });
    chips.forEach(function (c) {
      if (c === active) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
    });
  }

  function syncHash() {
    var i = current();
    var url = location.pathname + location.search + (i > 0 ? '#page-' + (i + 1) : '');
    if (history.replaceState) history.replaceState(null, '', url);
  }

  function goTo(n) {
    var i = Math.min(Math.max(n, 1), total) - 1;
    ensure(i);
    if (visible(current()).indexOf(i) !== -1) return;
    flip.flip(i);
  }

  // Couverture et quatrième de couverture seules : le livre est recentré, comme un livre fermé.
  function setEdge(state) {
    var i = current();
    var edge = '';
    if (flip.getOrientation() !== 'portrait' && (state || flip.getState()) === 'read') {
      if (i === 0) edge = 'start';
      else if (i === total - 1 && i % 2 === 1) edge = 'end';
    }
    stage.setAttribute('data-edge', edge);
  }

  flip.on('init', function () {
    root.classList.add('is-ready');
    setEdge();
    updateUI();
  });
  flip.on('flip', function () {
    ensure(current());
    updateUI();
    syncHash();
    if (!zoom.hidden) renderZoom();
  });
  flip.on('changeOrientation', function () { setEdge(); updateUI(); });
  flip.on('changeState', function (e) {
    if (e.data === 'user_fold' || e.data === 'fold_corner' || e.data === 'flipping') ensure(current());
    if (e.data === 'flipping') stage.setAttribute('data-edge', '');
    if (e.data === 'read') setEdge('read');
  });

  // Divi place le contenu dans un calque de priorité 1, sous l'en-tête : pour la vue agrandie et le
  // plein cadre, on remonte temporairement les ancêtres qui forment un calque.
  var raised = [];
  function raise(on) {
    if (!on) {
      if (!zoom.hidden || viewer.classList.contains('is-max')) return;
      raised.forEach(function (r) { r.el.style.zIndex = r.z; });
      raised = [];
      return;
    }
    if (raised.length) return;
    for (var el = viewer.parentElement; el && el !== document.body; el = el.parentElement) {
      if (getComputedStyle(el).zIndex !== 'auto') {
        raised.push({ el: el, z: el.style.zIndex });
        el.style.zIndex = '2147483000';
      }
    }
  }

  // Vue agrandie
  var zoomLevels = [1, 1.5, 2, 3];
  var zoomIndex = 0;
  var lastFocus = null;

  function zoomFit(count) {
    var vw = zoomScroll.clientWidth - 32;
    return count > 1 ? Math.min(vw, W * 2) : Math.min(vw, 1100, W);
  }
  function applyZoom(keepCenter) {
    var count = zoomPages.children.length || 1;
    var before = { w: zoomPages.offsetWidth || 1, x: zoomScroll.scrollLeft + zoomScroll.clientWidth / 2, y: zoomScroll.scrollTop + zoomScroll.clientHeight / 2 };
    var width = Math.round(zoomFit(count) * zoomLevels[zoomIndex]);
    zoomPages.style.width = width + 'px';
    if (keepCenter) {
      var k = width / before.w;
      zoomScroll.scrollLeft = before.x * k - zoomScroll.clientWidth / 2;
      zoomScroll.scrollTop = before.y * k - zoomScroll.clientHeight / 2;
    }
    zoom.querySelector('[data-gkc-zoom-act="out"]').disabled = zoomIndex === 0;
    zoom.querySelector('[data-gkc-zoom-act="in"]').disabled = zoomIndex === zoomLevels.length - 1;
  }
  function renderZoom() {
    var pages = visible(current());
    zoomPages.textContent = '';
    pages.forEach(function (p) {
      var src = pageEls[p].querySelector('img');
      var img = document.createElement('img');
      img.src = src.getAttribute('data-src');
      img.alt = src.alt;
      img.width = W;
      img.height = H;
      img.draggable = false;
      zoomPages.appendChild(img);
    });
    zoomPages.classList.toggle('is-spread', pages.length > 1);
    zoomLabel.textContent = (pages.length > 1 ? 'Pages ' : 'Page ') + label(pages) + ' / ' + total;
    applyZoom(false);
    zoomScroll.scrollTop = 0;
    zoomScroll.scrollLeft = 0;
  }
  function openZoom() {
    lastFocus = document.activeElement;
    zoomIndex = 0;
    zoom.hidden = false;
    raise(true);
    document.documentElement.classList.add('gkc-lock');
    renderZoom();
    zoom.querySelector('[data-gkc-zoom-act="close"]').focus();
  }
  function closeZoom() {
    zoom.hidden = true;
    raise(false);
    zoomPages.textContent = '';
    if (!viewer.classList.contains('is-max')) document.documentElement.classList.remove('gkc-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  zoom.addEventListener('click', function (e) {
    var b = e.target.closest('[data-gkc-zoom-act]');
    if (!b) return;
    var act = b.getAttribute('data-gkc-zoom-act');
    if (act === 'close') closeZoom();
    if (act === 'in' && zoomIndex < zoomLevels.length - 1) { zoomIndex++; applyZoom(true); }
    if (act === 'out' && zoomIndex > 0) { zoomIndex--; applyZoom(true); }
  });
  // Déplacement à la souris dans la vue agrandie (le tactile défile nativement).
  var drag = null;
  zoomScroll.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, l: zoomScroll.scrollLeft, t: zoomScroll.scrollTop };
    zoomScroll.classList.add('is-dragging');
  });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    zoomScroll.scrollLeft = drag.l - (e.clientX - drag.x);
    zoomScroll.scrollTop = drag.t - (e.clientY - drag.y);
  });
  window.addEventListener('pointerup', function () {
    drag = null;
    zoomScroll.classList.remove('is-dragging');
  });

  // Plein écran, avec repli en plein cadre là où l'API n'existe pas (iPhone).
  function setMax(on) {
    viewer.classList.toggle('is-max', on);
    raise(on);
    document.documentElement.classList.toggle('gkc-lock', on);
    onFullChange();
  }
  function onFullChange() {
    var on = isFull();
    viewer.classList.toggle('is-full', on);
    fullBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    fullBtn.setAttribute('aria-label', on ? 'Quitter le plein écran' : 'Plein écran');
    relayout();
    updateUI();
  }
  function toggleFull() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      return;
    }
    if (viewer.classList.contains('is-max')) { setMax(false); return; }
    var req = viewer.requestFullscreen || viewer.webkitRequestFullscreen;
    if (!req) { setMax(true); return; }
    try {
      var p = req.call(viewer);
      if (p && p.catch) p.catch(function () { setMax(true); });
    } catch (err) { setMax(true); }
  }
  document.addEventListener('fullscreenchange', onFullChange);
  document.addEventListener('webkitfullscreenchange', onFullChange);

  root.addEventListener('click', function (e) {
    var go = e.target.closest('[data-gkc-goto]');
    if (go && root.contains(go)) {
      e.preventDefault();
      goTo(parseInt(go.getAttribute('data-gkc-goto'), 10));
      if (go.closest('.gkc-chapters')) {
        var r = viewer.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) viewer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    var b = e.target.closest('[data-gkc-act]');
    if (!b || b.disabled) return;
    var act = b.getAttribute('data-gkc-act');
    if (act === 'prev') { ensure(current() - 2); flip.flipPrev(); }
    if (act === 'next') { ensure(current() + 2); flip.flipNext(); }
    if (act === 'first') goTo(1);
    if (act === 'last') goTo(total);
    if (act === 'zoom') openZoom();
    if (act === 'full') toggleFull();
  });

  window.addEventListener('hashchange', function () {
    var h = /page[-=](\d+)/.exec(location.hash);
    if (h) goTo(parseInt(h[1], 10));
  });

  var inView = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
    }, { threshold: 0.35 }).observe(viewer);
  }

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    if (e.key === 'Escape') {
      if (!zoom.hidden) { closeZoom(); return; }
      if (viewer.classList.contains('is-max')) { setMax(false); return; }
      if ((document.fullscreenElement || document.webkitFullscreenElement) === viewer) { toggleFull(); return; }
    }
    if (!(inView || isFull() || !zoom.hidden)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); ensure(current() + 2); flip.flipNext(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); ensure(current() - 2); flip.flipPrev(); }
  });
})();
