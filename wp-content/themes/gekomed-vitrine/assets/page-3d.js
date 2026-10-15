/* Pages « Notre atelier » et « Économies carbone » : apparitions au défilement et maquettes 3D chargées à l'approche,
   comme sur l'accueil (three.js r128 depuis window.GX_THREE, puis window.GxAtelier(racine) ou window.GxCans(racine)). */
(() => {
 const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const hasIO = 'IntersectionObserver' in window;
 document.documentElement.classList.add('gx-js');

 const reveals = document.querySelectorAll('[data-reveal]');
 if (hasIO && !reduce) {
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
   if (!entry.isIntersecting) return;
   entry.target.classList.add('is-in'); io.unobserve(entry.target);
  }), {rootMargin: '0px 0px -8% 0px', threshold: 0.12});
  reveals.forEach((el, i) => { el.style.setProperty('--gx-delay', (i % 4) * 70 + 'ms'); io.observe(el); });
 } else reveals.forEach(el => el.classList.add('is-in'));

 const webgl = (() => { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } })();
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
 const lazy3D = (selector, factory) => document.querySelectorAll(selector).forEach(root => {
  const fail = () => { root.classList.add('is-fallback'); root.setAttribute('aria-busy', 'false'); };
  if (!webgl || !hasIO) { fail(); return; }
  const io = new IntersectionObserver(([entry]) => {
   if (!entry.isIntersecting) return;
   io.disconnect();
   root.classList.add('is-loading');
   root.setAttribute('aria-busy', 'true');
   loadThree().then(() => {
    if (typeof window[factory] !== 'function') throw new Error(factory);
    return window[factory](root);
   }).catch(fail).finally(() => { root.classList.remove('is-loading'); root.setAttribute('aria-busy', 'false'); });
  }, {rootMargin: '700px 0px'});
  io.observe(root);
 });
 lazy3D('[data-atelier]', 'GxAtelier');
 lazy3D('[data-cans]', 'GxCans');
})();
