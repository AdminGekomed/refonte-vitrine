/* Témoignages de l'accueil (template-parts/temoignages.php) : boîte de réception, pile de lettres ou stories.
   Sans ce script, les messages restent affichés à la suite. */
(() => {
 const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
 const easeOut = 'cubic-bezier(.23,1,.32,1)';
 const pad = n => String(n).padStart(2, '0');
 const typing = e => e.target.closest('input, textarea, select, [contenteditable]');

 // Boîte de réception : liste à gauche, message ouvert à droite, filtre par public, pastille « non lu ».
 document.querySelectorAll('[data-inbox]').forEach(root => {
  const list = root.querySelector('[role="tablist"]');
  const tabs = [...list.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  const unread = root.querySelector('[data-inbox-unread]');
  const filters = [...root.querySelectorAll('[data-filtre]')];
  const shown = () => tabs.filter(tab => !tab.hidden);
  const current = () => tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
  const countUnread = () => {
   const n = tabs.filter(tab => tab.classList.contains('is-unread')).length;
   unread.textContent = n ? `${n} non lu${n > 1 ? 's' : ''}` : 'Tout est lu';
  };
  // Garde le message choisi visible dans la liste, sans faire défiler la page.
  const keepVisible = tab => {
   const l = list.getBoundingClientRect(), r = tab.getBoundingClientRect();
   const top = r.top < l.top ? r.top - l.top : r.bottom > l.bottom ? r.bottom - l.bottom : 0;
   const left = r.left < l.left ? r.left - l.left : r.right > l.right ? r.right - l.right : 0;
   if (top || left) list.scrollBy({top, left, behavior: reduce ? 'auto' : 'smooth'});
  };
  const open = (tab, {focusTab = false, focusPanel = false, animate = false} = {}) => {
   tabs.forEach((t, i) => {
    const on = t === tab;
    t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; panels[i].hidden = !on;
   });
   tab.classList.remove('is-unread'); countUnread(); keepVisible(tab);
   const panel = panels[tabs.indexOf(tab)];
   panel.scrollTop = 0;
   if (focusTab) tab.focus();
   if (focusPanel) panel.focus({preventScroll: true});
   if (animate && !reduce) panel.animate([{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'none'}], {duration: 240, easing: easeOut});
  };
  const step = (dir, opts) => {
   const l = shown(), i = l.indexOf(current());
   open(l[(i + dir + l.length) % l.length], opts);
  };
  tabs.forEach(tab => tab.addEventListener('click', () => open(tab, {animate: true})));
  // Clavier : pas d'animation, la sélection suit les flèches.
  list.addEventListener('keydown', e => {
   const keys = {ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1};
   if (e.key in keys) { e.preventDefault(); step(keys[e.key], {focusTab: true}); }
   else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); const l = shown(); open(l[e.key === 'Home' ? 0 : l.length - 1], {focusTab: true}); }
  });
  root.querySelectorAll('[data-inbox-next]').forEach(btn => btn.addEventListener('click', () => step(1, {focusPanel: true, animate: true})));
  filters.forEach(btn => btn.addEventListener('click', () => {
   const f = btn.dataset.filtre;
   filters.forEach(b => b.setAttribute('aria-pressed', b === btn));
   tabs.forEach(tab => { tab.hidden = f !== 'tous' && tab.dataset.public !== f; });
   list.scrollTo({top: 0, left: 0});
   const cur = current();
   if (!cur || cur.hidden) open(shown()[0], {animate: true});
  }));
  root.classList.add('is-ready');
  open(tabs[0]);
 });

 // Pile de lettres : la lettre du dessus se lance d'un geste (ou par les boutons), la suivante remonte.
 document.querySelectorAll('[data-pile]').forEach(root => {
  const deck = root.querySelector('[data-pile-deck]');
  const num = root.querySelector('[data-pile-n]');
  const total = deck.children.length;
  let order = [...deck.children], busy = false, drag = null;
  const layout = () => {
   order.forEach((card, pos) => {
    card.dataset.pos = Math.min(pos, 3);
    card.inert = pos > 0;
   });
   num.textContent = pad(+order[0].dataset.i + 1);
  };
  const settle = (card, ms) => setTimeout(() => {
   card.style.transition = 'none';
   card.style.transform = card.style.opacity = card.style.zIndex = '';
   void card.offsetWidth;
   card.style.transition = '';
   busy = false;
  }, ms);
  const next = (dir = 1) => {
   if (busy) return;
   const card = order[0];
   order = [...order.slice(1), card];
   if (reduce) { layout(); return; }
   busy = true;
   card.classList.remove('is-dragging');
   card.style.zIndex = 9;
   card.style.transition = `transform .4s ${easeOut}, opacity .4s ease`;
   card.style.transform = `translateX(${dir * 115}%) rotate(${dir * 12}deg)`;
   card.style.opacity = '0';
   layout();
   settle(card, 400);
  };
  const prev = () => {
   if (busy) return;
   const card = order[total - 1];
   order = [card, ...order.slice(0, total - 1)];
   if (reduce) { layout(); return; }
   busy = true;
   card.style.transition = 'none';
   card.style.zIndex = 9;
   card.style.transform = 'translateX(-115%) rotate(-12deg)';
   card.style.opacity = '0';
   void card.offsetWidth;
   layout();
   card.style.transition = `transform .45s ${easeOut}, opacity .3s ease`;
   card.style.transform = card.style.opacity = '';
   settle(card, 450);
  };
  root.querySelector('[data-pile-next]').addEventListener('click', () => next(1));
  root.querySelector('[data-pile-prev]').addEventListener('click', prev);
  root.addEventListener('keydown', e => {
   if (typing(e)) return;
   if (e.key === 'ArrowRight') { e.preventDefault(); next(1); }
   else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  });
  // Geste : on ne prend la main que si le mouvement est d'abord horizontal (le défilement vertical reste libre).
  deck.addEventListener('pointerdown', e => {
   const card = order[0];
   if (drag || busy || !card.contains(e.target) || e.target.closest('a, button') || (e.pointerType === 'mouse' && e.button !== 0)) return;
   drag = {id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, on: false, card};
  });
  deck.addEventListener('pointermove', e => {
   if (!drag || e.pointerId !== drag.id) return;
   const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
   if (!drag.on) {
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
    if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
    drag.on = true;
    drag.card.setPointerCapture(e.pointerId);
    drag.card.classList.add('is-dragging');
   }
   drag.dx = dx;
   drag.card.style.transform = `translateX(${dx}px) rotate(${dx * .035}deg)`;
  });
  const release = e => {
   if (!drag || e.pointerId !== drag.id) return;
   const {card, dx, t, on} = drag;
   drag = null;
   if (!on) return;
   const speed = Math.abs(dx) / (performance.now() - t);
   if (Math.abs(dx) > card.offsetWidth * .28 || (speed > .5 && Math.abs(dx) > 30)) next(Math.sign(dx) || 1);
   else { card.classList.remove('is-dragging'); card.style.transform = ''; }
  };
  deck.addEventListener('pointerup', release);
  deck.addEventListener('pointercancel', release);
  root.classList.add('is-ready');
  layout();
 });

 // Stories : un extrait à la fois, avance seule (7 s), pause au survol, sur le bouton, hors écran ou message ouvert.
 document.querySelectorAll('[data-stories]').forEach(root => {
  const story = root.querySelector('[data-story]');
  const slides = [...story.querySelectorAll('.gx-story__slide')];
  const bars = [...story.querySelectorAll('.gx-story__bars > span')];
  const index = [...root.querySelectorAll('[data-story-go]')];
  const pauseBtn = story.querySelector('[data-story-pause]');
  let cur = 0, userPaused = reduce, inView = false, hover = false;
  const sync = () => {
   const paused = userPaused || !inView || hover || document.hidden || !!slides[cur].querySelector('details[open]');
   story.classList.toggle('is-paused', paused);
   pauseBtn.setAttribute('aria-pressed', userPaused);
   pauseBtn.setAttribute('aria-label', userPaused ? 'Reprendre le défilement' : 'Mettre en pause');
  };
  const show = i => {
   slides[cur].querySelector('details')?.removeAttribute('open');
   cur = (i + slides.length) % slides.length;
   slides.forEach((s, k) => s.classList.toggle('is-current', k === cur));
   bars.forEach((b, k) => { b.classList.remove('is-current'); b.classList.toggle('is-done', k < cur); });
   void bars[cur].offsetWidth;
   bars[cur].classList.add('is-current');
   index.forEach((b, k) => b.setAttribute('aria-current', k === cur));
   sync();
  };
  bars.forEach(b => b.firstElementChild.addEventListener('animationend', () => { if (b.classList.contains('is-current')) show(cur + 1); }));
  story.querySelector('[data-story-prev]').addEventListener('click', () => show(cur - 1));
  story.querySelector('[data-story-next]').addEventListener('click', () => show(cur + 1));
  index.forEach((b, k) => b.addEventListener('click', () => show(k)));
  pauseBtn.addEventListener('click', () => { userPaused = !userPaused; sync(); });
  story.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = true; sync(); } });
  story.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hover = false; sync(); } });
  story.addEventListener('toggle', sync, true);
  root.addEventListener('keydown', e => {
   if (typing(e)) return;
   if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1); }
   else if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1); }
  });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }, {threshold: .5}).observe(story);
  else inView = true;
  root.classList.add('is-ready');
  show(0);
 });
})();
