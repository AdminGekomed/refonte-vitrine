/* Actualités : filtre par sujet et recherche sur place, sans recharger la page.
   L'adresse garde le filtre (?sujet=, ?q=) pour le partage et le retour arrière ; le premier article visible est mis en avant.
   Sur mobile, le panneau de filtres s'ouvre en volet depuis le bouton flottant « Filtrer ». */
(() => {
 const root = document.querySelector('[data-journal]');
 if (!root) return;
 const form = root.querySelector('.gv-blog__tools');
 const panel = root.querySelector('.gv-blog__side');
 const links = Array.from(root.querySelectorAll('[data-sujet]'));
 const input = root.querySelector('input[type="search"]');
 const cards = Array.from(root.querySelectorAll('.gv-blog__grid .gv-article'));
 const count = root.querySelector('[data-count]');
 const empty = root.querySelector('[data-empty]');
 const sideReset = root.querySelector('.gv-blog__reset');
 const fab = root.querySelector('[data-open]');
 const fabLabel = root.querySelector('[data-fab-label]');
 const scrim = root.querySelector('.gv-blog__scrim');
 const sheet = matchMedia('(max-width: 999px)');
 const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
 const norm = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
 const params = new URLSearchParams(location.search);
 let sujet = links.some(a => a.dataset.sujet === params.get('sujet')) ? params.get('sujet') : '';
 let timer, open = false;

 function apply(push) {
  const q = norm(input.value);
  let shown = 0;
  cards.forEach(card => {
   const ok = (!sujet || card.dataset.sujets.split(' ').includes(sujet)) && (!q || card.dataset.texte.includes(q));
   const wasHidden = card.hidden;
   card.hidden = !ok;
   card.classList.toggle('is-feature', ok && shown === 0);
   if (ok && wasHidden && !reduce) { card.classList.remove('is-shown'); void card.offsetWidth; card.classList.add('is-shown'); }
   if (ok) shown++;
  });
  links.forEach(a => { if (a.dataset.sujet === sujet) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  empty.hidden = shown > 0;
  sideReset.hidden = !sujet && !q;
  count.textContent = `${shown} article${shown > 1 ? 's' : ''} affiché${shown > 1 ? 's' : ''}`;
  const label = sujet ? links.find(a => a.dataset.sujet === sujet).querySelector('b').textContent : '';
  fabLabel.textContent = sujet || q ? `Filtrer · ${label || '« ' + input.value.trim() + ' »'}` : 'Filtrer';
  fab.classList.toggle('is-active', !!(sujet || q));
  const hidden = form.querySelector('input[name="sujet"]'); if (hidden) hidden.remove();
  const url = new URL(location.href);
  sujet ? url.searchParams.set('sujet', sujet) : url.searchParams.delete('sujet');
  input.value.trim() ? url.searchParams.set('q', input.value.trim()) : url.searchParams.delete('q');
  history[push ? 'pushState' : 'replaceState']({ sujet, q: input.value }, '', url);
 }
 // Remonte au début de la liste quand le filtre change et que la liste est déjà dépassée.
 const main = root.querySelector('.gv-blog__main');
 const toTop = () => {
  const top = main.getBoundingClientRect().top;
  if (top < 0) scrollBy({ top: top - 120, behavior: reduce ? 'auto' : 'smooth' });
 };
 // Le bouton flottant n'apparaît que lorsque la liste est à l'écran (ni sur l'en-tête, ni sur le pied de page).
 if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => fab.classList.toggle('is-away', !entry.isIntersecting), { rootMargin: '-35% 0px -20% 0px' }).observe(main);

 // Volet mobile.
 function setOpen(value) {
  open = value && sheet.matches;
  root.classList.toggle('is-open', open);
  fab.setAttribute('aria-expanded', String(open));
  scrim.hidden = !open;
  document.documentElement.classList.toggle('gv-noscroll', open);
  if (open) panel.querySelector('.gv-blog__close').focus();
  else if (value === false && sheet.matches) fab.focus();
 }
 function syncMode() {
  root.classList.toggle('is-sheet', sheet.matches);
  fab.hidden = !sheet.matches;
  if (sheet.matches) panel.setAttribute('role', 'dialog'); else panel.removeAttribute('role');
  panel.setAttribute('aria-modal', String(sheet.matches));
  if (!sheet.matches) setOpen(false);
 }

 links.forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  sujet = a.dataset.sujet;
  apply(true);
  if (open) setOpen(false);
  toTop();
 }));
 input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => apply(false), 120); });
 form.addEventListener('submit', e => { e.preventDefault(); apply(false); input.blur(); if (open) setOpen(false); toTop(); });
 root.querySelectorAll('[data-reset]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); sujet = ''; input.value = ''; apply(true); }));
 fab.addEventListener('click', () => setOpen(true));
 root.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => setOpen(false)));
 document.addEventListener('keydown', e => {
  if (!open) return;
  if (e.key === 'Escape') { setOpen(false); return; }
  if (e.key !== 'Tab') return;
  // Le focus reste dans le volet tant qu'il est ouvert.
  const items = Array.from(panel.querySelectorAll('a[href]:not([hidden]), button, input:not([type="hidden"])')).filter(el => el.offsetParent !== null);
  const first = items[0], last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
 });
 addEventListener('popstate', () => {
  const p = new URLSearchParams(location.search);
  sujet = links.some(a => a.dataset.sujet === p.get('sujet')) ? p.get('sujet') : '';
  input.value = p.get('q') || '';
  apply(false);
 });
 sheet.addEventListener('change', syncMode);
 root.classList.add('is-enhanced');
 syncMode();
 apply(false);
})();
