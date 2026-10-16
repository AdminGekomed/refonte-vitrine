(() => {
 const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const hasIO = 'IntersectionObserver' in window;
 document.documentElement.classList.add('gx-js');

 // En-tête transparent sur la couverture, opaque dès qu'on la quitte.
 const header = document.querySelector('.gv-header'), hero = document.querySelector('.gx-hero');
 const siteLoader = document.getElementById('gx-site-loader');
 const html = document.documentElement;
 let siteBlocked = html.classList.contains('gx-site-loading'), siteReleaseTimer = 0;
 const siteRegions = [...document.querySelectorAll('.gv-skip, .gv-header, main, footer')].map(el => ({el, inert:el.inert}));
 if (siteBlocked) siteRegions.forEach(item => { item.el.inert = true; });
 const releaseSiteLoader = immediate => {
  clearTimeout(window.GX_PRELOAD_TIMER);
  if (!siteBlocked) return;
  clearTimeout(siteReleaseTimer);
  const finish = animate => {
   html.classList.remove('gx-site-loading', 'gx-site-revealing');
   siteRegions.forEach(item => { item.el.inert = item.inert; });
   window.removeEventListener('pageshow', releaseRestoredSiteLoader);
   window.removeEventListener('scroll', releaseRestoredSiteLoader);
   siteBlocked = false;
   if (animate) header?.classList.add('is-site-entered');
  };
  if (immediate) { siteLoader?.classList.add('is-cancelled'); finish(false); }
  else {
   html.classList.replace('gx-site-loading', 'gx-site-revealing');
   siteReleaseTimer = setTimeout(() => finish(true), 750);
  }
 };
 if (siteLoader) siteLoader._gxCancel = () => releaseSiteLoader(true);
 // La page et ses scripts sont arrivés : premier palier réel de la barre (ensuite three.js, puis le modèle octet par octet).
 if (siteBlocked && siteLoader) siteLoader.style.setProperty('--gx-load', '.14');
 const setLoadProgress = (root, value) => {
  root.style.setProperty('--gx-load', value);
  if (siteLoader) siteLoader.style.setProperty('--gx-load', value);
 };
 if (header && hero && hasIO) {
  const sentinel = document.createElement('span');
  sentinel.className = 'gx-sentinel'; sentinel.setAttribute('aria-hidden', 'true');
  hero.prepend(sentinel);
  new IntersectionObserver(([entry]) => header.classList.toggle('is-solid', !entry.isIntersecting)).observe(sentinel);
 } else header?.classList.add('is-solid');

 // Apparition des blocs au défilement.
 const reveals = document.querySelectorAll('[data-reveal]');
 if (hasIO && !reduce) {
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
   if (!entry.isIntersecting) return;
   entry.target.classList.add('is-in'); io.unobserve(entry.target);
  }), {rootMargin: '0px 0px -8% 0px', threshold: 0.12});
  reveals.forEach((el, i) => { el.style.setProperty('--gx-delay', (i % 4) * 70 + 'ms'); io.observe(el); });
 } else reveals.forEach(el => el.classList.add('is-in'));

 // Chiffres : comptage court à l'entrée à l'écran.
 const counters = document.querySelectorAll('[data-count]');
 if (hasIO && !reduce) {
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
   if (!entry.isIntersecting) return;
   io.unobserve(entry.target);
   const el = entry.target, end = parseFloat(el.dataset.count), t0 = performance.now(), dur = 1100;
   // data-decimals : chiffres après la virgule, écrits à la française (3,3).
   const dec = parseInt(el.dataset.decimals || '0', 10), fmt = v => dec ? v.toLocaleString('fr-FR', {minimumFractionDigits: dec, maximumFractionDigits: dec}) : Math.round(v);
   const step = now => { const k = Math.min(1, (now - t0) / dur); el.textContent = fmt(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
   requestAnimationFrame(step);
  }), {threshold: 0.6});
  counters.forEach(el => io.observe(el));
 }

 // Processus : parcours 3D piloté par le défilement si WebGL est là et les animations permises ;
 // sinon, grille en trois étapes où l'étape au centre de l'écran pilote l'illustration et la jauge.
 const webgl = (() => { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } })();
 const process = document.querySelector('.gx-process');
 const journeyFits = !window.matchMedia('(max-width: 980px) and (max-height: 600px)').matches;
 if (process && process.querySelector('[data-journey]') && webgl && hasIO && !reduce && journeyFits) process.classList.add('is-journey');
 if (!process?.classList.contains('is-journey')) releaseSiteLoader(true);
 // La restauration du navigateur peut nous placer sous l'introduction avant
 // que l'observateur 3D ait démarré. Ne pas couvrir cette position restaurée.
 function releaseRestoredSiteLoader(){
  if (!siteBlocked) return;
  const journey = process?.querySelector('[data-journey]'), pin = journey?.querySelector('.gx-journey__pin');
  if (!journey || !pin) { releaseSiteLoader(true); return; }
  const top = parseFloat(getComputedStyle(pin).top) || 0;
  if (journey.getBoundingClientRect().top < top - 8) releaseSiteLoader(true);
 }
 if (siteBlocked) {
  window.addEventListener('pageshow', releaseRestoredSiteLoader);
  window.addEventListener('scroll', releaseRestoredSiteLoader, {passive:true});
  requestAnimationFrame(releaseRestoredSiteLoader);
 }
 if (process && hasIO) {
  const steps = [...process.querySelectorAll('.gx-step')];
  const stages = [...process.querySelectorAll('[data-stage]')];
  const activate = index => {
   steps.forEach((s, i) => s.classList.toggle('is-active', i === index));
   stages.forEach((img, i) => img.classList.toggle('is-active', i === index));
   process.style.setProperty('--gx-progress', ((index + 1) / steps.length).toFixed(3));
  };
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
   if (entry.isIntersecting) activate(steps.indexOf(entry.target));
  }), {rootMargin: '-45% 0px -45% 0px'});
  steps.forEach(s => io.observe(s));
  activate(0);
 }

 // three.js n'est chargé qu'une fois, à l'approche de la première maquette.
 let threePromise = null;
 const loadThree = () => {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (threePromise) return threePromise;
  threePromise = new Promise((resolve, reject) => {
   const s = document.createElement('script');
   const timer = setTimeout(() => reject(new Error('three-timeout')), 12000);
   s.src = window.GX_THREE; s.async = true; s.crossOrigin = 'anonymous';
   s.onload = () => { clearTimeout(timer); window.THREE ? resolve(window.THREE) : reject(new Error('three')); };
   s.onerror = () => { clearTimeout(timer); reject(new Error('three')); };
   document.head.appendChild(s);
  });
  return threePromise;
 };
 const lazy3D = (selector, factory, onFail) => {
  document.querySelectorAll(selector).forEach(root => {
   const fail = () => { root.classList.add('is-fallback'); root.classList.remove('is-entering'); root.setAttribute('aria-busy', 'false'); if (factory === 'GxParcours') releaseSiteLoader(true); if (onFail) onFail(); };
   if (factory === 'GxParcours') {
    root._gxRevealSite = () => releaseSiteLoader(false);
    root._gxCancelSiteLoading = () => releaseSiteLoader(true);
    root._gxSetLoadProgress = value => setLoadProgress(root, value);
   }
   if (!webgl || !hasIO) { fail(); return; }
   const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    root.classList.add('is-loading');
    root._gxLoadingStarted = performance.now();
    root.setAttribute('aria-busy', 'true');
    setLoadProgress(root, '.16');
    loadThree().then(() => {
     if (factory === 'GxParcours' && (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(max-width: 980px) and (max-height: 600px)').matches)){ fail(); return; }
     setLoadProgress(root, '.28');
     const init = window[factory];
     if (typeof init !== 'function') throw new Error(factory);
     return init(root);
    }).catch(fail).finally(() => { root.classList.remove('is-loading'); root.setAttribute('aria-busy', 'false'); if (factory === 'GxParcours') releaseSiteLoader(root.classList.contains('is-fallback')); });
   }, {rootMargin: '700px 0px'});
   io.observe(root);
  });
 };
 lazy3D('.gx-process.is-journey [data-journey]', 'GxParcours', () => process.classList.remove('is-journey'));
 lazy3D('[data-atelier]', 'GxAtelier');
})();

// Le journal : carrousel qu'on fait glisser. À la souris, on attrape la rangée et on la lâche : elle garde un peu d'élan
// puis s'arrête sur une carte. Au doigt et au pavé tactile, le défilement reste natif. La piste suit le défilement ;
// un glissé ne déclenche pas le lien de la carte lâchée.
(() => {
 const liste = document.querySelector('[data-carrousel]');
 if (!liste) return;
 const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
 const pouce = document.querySelector('[data-carrousel-pouce]');
 let ticking = false;
 const maj = () => {
  ticking = false;
  if (!pouce) return;
  const max = liste.scrollWidth - liste.clientWidth, part = Math.min(1, liste.clientWidth / liste.scrollWidth);
  pouce.style.width = `${part * 100}%`;
  pouce.style.transform = `translateX(${max > 0 ? (liste.scrollLeft / max) * (1 / part - 1) * 100 : 0}%)`;
 };
 liste.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(maj); } }, { passive: true });
 addEventListener('resize', maj, { passive: true });
 maj();

 // Glisser à la souris.
 let actif = false, glisse = false, x0 = 0, s0 = 0, derniers = [];
 const arret = cible => {
  // Carte la plus proche de la position visée (bornée aux extrémités).
  const cartes = [...liste.children], g = liste.getBoundingClientRect().left;
  const positions = cartes.map(c => c.getBoundingClientRect().left - g + liste.scrollLeft);
  const max = liste.scrollWidth - liste.clientWidth;
  let best = positions.reduce((a, p) => (Math.abs(p - cible) < Math.abs(a - cible) ? p : a), positions[0] ?? 0);
  return Math.max(0, Math.min(max, best));
 };
 liste.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse' || e.button !== 0) return;
  actif = true; glisse = false; x0 = e.clientX; s0 = liste.scrollLeft; derniers = [[e.timeStamp, e.clientX]];
 });
 addEventListener('pointermove', e => {
  if (!actif) return;
  const dx = e.clientX - x0;
  if (!glisse && Math.abs(dx) > 5) { glisse = true; liste.classList.add('is-drag'); }
  if (!glisse) return;
  e.preventDefault();
  liste.scrollLeft = s0 - dx;
  derniers.push([e.timeStamp, e.clientX]);
  if (derniers.length > 5) derniers.shift();
 });
 const lacher = () => {
  if (!actif) return;
  actif = false;
  if (!glisse) return;
  // Élan : vitesse des derniers mouvements, prolongée un court instant.
  const [t1, x1] = derniers[0], [t2, x2] = derniers[derniers.length - 1];
  const vitesse = t2 > t1 ? (x2 - x1) / (t2 - t1) : 0;
  const cible = arret(liste.scrollLeft - vitesse * 220);
  liste.classList.remove('is-drag');
  liste.style.scrollSnapType = 'none';
  liste.scrollTo({ left: cible, behavior: reduce ? 'auto' : 'smooth' });
  clearTimeout(lacher.t);
  lacher.t = setTimeout(() => { liste.style.scrollSnapType = ''; }, reduce ? 0 : 650);
  // Le clic qui suit un glissé n'ouvre pas l'article.
  const bloque = ev => { ev.preventDefault(); ev.stopPropagation(); };
  liste.addEventListener('click', bloque, { capture: true, once: true });
  setTimeout(() => liste.removeEventListener('click', bloque, { capture: true }), 0);
 };
 addEventListener('pointerup', lacher);
 addEventListener('pointercancel', lacher);
 liste.addEventListener('dragstart', e => e.preventDefault());
})();
